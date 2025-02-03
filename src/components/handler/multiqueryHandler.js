const { ChatOpenAI } = require("@langchain/openai");
const { MultiQueryRetriever } = require("langchain/retrievers/multi_query");
const config = require("../../config");

class MultiQueryHandler {
    constructor(vectorStore) {
        if (!vectorStore) {
            throw new Error("Vector store must be provided");
        }

        // Initialize the LLM with ChatOpenAI instead of Teams AI OpenAI model
        this.llm = new ChatOpenAI({
            modelName: config.openAIModelName,
            temperature: 0,
            openAIApiKey: config.openAIKey,
        });

        // Create a basic retriever from the vector store
        const baseRetriever = {
            getRelevantDocuments: async (query) => {
                return await vectorStore.similaritySearch(query);
            },
        };

        // Initialize the MultiQueryRetriever with the correct components
        this.retriever = MultiQueryRetriever.fromLLM({
            llm: this.llm,
            retriever: baseRetriever,
            verbose: true,
        });
    }

    /**
     * Performs a multi-query search on the vector store.
     * @param {string} query - The search query
     * @returns {Promise<Document[]>} Array of similar documents
     */
    async search(query) {
        if (!query || typeof query !== 'string') {
            throw new Error("Invalid query provided");
        }

        try {
            // Use getRelevantDocuments instead of invoke
            const results = await this.retriever.getRelevantDocuments(query);
            return results;
        } catch (error) {
            console.error("Error during multi-query search:", error);
            throw error;
        }
    }
}

module.exports = {
    MultiQueryHandler
};