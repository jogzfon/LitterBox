const path = require("path");
const fs = require("fs");
const { VectorStoreManager } = require('../components/memory/vectorStoreManager');
const { DocumentProcessor } = require('../components/document/documentProcessor');

/**
 * A data source that searches through a local directory of files for a given query.
 */
class MyDataSource {
    /**
     * Creates a new instance of MyDataSource.
     * @param {string} name - The name of the data source
     */
    constructor(name) {
        this.name = name;
        this.vectorStoreManager = new VectorStoreManager();
        this.documentProcessor = new DocumentProcessor({
            chunkSize: 1000,
            chunkOverlap: 200,
            dataDir: path.join(__dirname, "../data"),
            cacheDir: path.join(__dirname, "../cache")
        });
    }
    
    /**
     * Initializes the data source by reading files and creating vector store.
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Load the vector store from disk if it exists
            await this.vectorStoreManager.loadVectorStore();

            // If the vector store doesn't exist, create it
            if (!this.vectorStoreManager.vectorStore) {
                const { chunks } = await this.documentProcessor.init();
                await this.vectorStoreManager.createVectorStore(chunks);
            }
        } catch (error) {
            console.error("Failed to initialize data source:", error);
            throw error;
        }
    }

    /**
     * Renders the data source as a string of text.
     * @param {Object} context - The context object
     * @param {Object} memory - The memory object
     * @param {Object} tokenizer - The tokenizer object
     * @param {number} maxTokens - Maximum number of tokens allowed
     * @returns {Promise<{output: string, length: number, tooLong: boolean}>}
     */
    async renderData(context, memory, tokenizer, maxTokens) {
        const query = memory.getValue("temp.input");
        
        if (!query) {
            return { output: "", length: 0, tooLong: false };
        }

        try {
            const results = await this.vectorStoreManager.search(query);
            
            if (results.length > 0) {
                const result = results[0].pageContent;
                const formattedOutput = this.formatDocument(result);
                
                return {
                    output: formattedOutput,
                    length: formattedOutput.length,
                    tooLong: formattedOutput.length > maxTokens
                };
            }
            
            return { output: "", length: 0, tooLong: false };
        } catch (error) {
            console.error("Error rendering data:", error);
            return { output: "", length: 0, tooLong: false };
        }
    }

    /**
     * Formats the result string
     * @param {string} result - The result to format
     * @returns {string} Formatted result
     */
    formatDocument(result) {
        return `<context>${result}</context>`;
    }
}

module.exports = {
    MyDataSource,
};