const path = require("path");
const fs = require("fs");
const { LocalFileStore } = require('langchain/storage/file_system');
const { CacheBackedEmbeddings } = require('langchain/embeddings/cache_backed');  
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { MultiQueryHandler } = require("../handler/multiqueryHandler")
const config = require("../../config");

/**
 * Manages vector store operations including embeddings and similarity search.
 */
class VectorStoreManager {
    /**
     * Initializes a new VectorStoreManager instance.
     */
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY environment variable is not set");
        }

        if (!config.embeddings_dir) {
            throw new Error("embeddings_dir not defined in config");
        }

        this.embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-large",
            apiKey: process.env.OPENAI_API_KEY
        });

        // Ensure the embeddings directory exists and is absolute
        const embeddingsDir = path.resolve('./src/embeddings');
        fs.mkdirSync(embeddingsDir, { recursive: true });

        // Initialize cache store with specific namespace
        const cacheDir = './src/cache';
        fs.mkdirSync(cacheDir, { recursive: true });
        
        this.store = new LocalFileStore({
            rootPath: cacheDir,
            ensureDirectoryExists: true
        });

        this.cachedEmbedder = new CacheBackedEmbeddings({
            underlyingEmbeddings: this.embeddings,
            documentEmbeddingStore: this.store,
            namespacePrefix: "doc_embeddings"
        });
        
        this.vectorStore = null;
        this.vectorStorePath = path.join(embeddingsDir, 'vectorstore.faiss');

        this.multiQueryHandler = null;
    }

    /**
     * Creates a vector store from document chunks.
     * @param {Document[]} chunks - Array of document chunks
     * @returns {Promise<FaissStore>} The created vector store
     */
    async createVectorStore(chunks) {
        try {
            if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
                throw new Error("Invalid chunks provided");
            }
            this.vectorStore = await FaissStore.fromDocuments(
                chunks,
                this.cachedEmbedder
            );
            // Save the vector store to disk
            await this.saveVectorStore();
            return this.vectorStore;
        } catch (error) {
            console.error("Failed to create vector store:", error);
            throw error;
        }
    }

    /**
     * Performs similarity search on the vector store.
     * @param {string} query - The search query
     * @param {number} k - Number of results to return
     * @returns {Promise<Document[]>} Array of similar documents
     */
    async search(query, k = 5) {
        if (!this.vectorStore) {
            throw new Error("Vector store not initialized. Call createVectorStore first.");
        }
        
        this.multiQueryHandler = new MultiQueryHandler(this.vectorStore);
        
        try {
            const results = await this.multiQueryHandler.search(query);
            // return results.slice(0, k); // Limit results to k documents
            return results;
        } catch (error) {
            console.error("Error during multiquery search:", error);
            throw error;
        }
    }

    /**
     * Saves the vector store to disk.
     * @returns {Promise<void>}
     */
    async saveVectorStore() {
        if (!this.vectorStore) {
            throw new Error("Vector store not initialized. Call createVectorStore first.");
        }

        try {
            await this.vectorStore.save(this.vectorStorePath);
        } catch (error) {
            console.error("Failed to save vector store:", error);
            throw error;
        }
    }

    /**
     * Loads the vector store from disk if it exists.
     * @returns {Promise<void>}
     */
    async loadVectorStore() {
        if (fs.existsSync(this.vectorStorePath)) {
            try {
                this.vectorStore = await FaissStore.load(
                    this.vectorStorePath,
                    this.cachedEmbedder
                );
            } catch (error) {
                console.error("Failed to load vector store:", error);
                throw error;
            }
        } else {
            console.log("No existing vector store found. A new one will be created.");
        }
    }
}


module.exports = {
    VectorStoreManager
};