const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { Document } = require("@langchain/core/documents");

class DocumentProcessor {
    constructor(config) {
        this.config = config;
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: config.chunkSize || 1000,
            chunkOverlap: config.chunkOverlap || 200,
            lengthFunction: (text) => text.length,
        });
        this.cacheDir = path.resolve('./src/cache');
        this.dataDir = path.resolve('./src/data');
        
        fs.mkdirSync(this.cacheDir, { recursive: true });
        fs.mkdirSync(this.dataDir, { recursive: true });
    }

    async init() {
        try {
            const { documents, chunks } = await this.loadAndSplitDocuments(this.dataDir);
            return { documents, chunks };
        } catch (error) {
            console.error("Failed to initialize document processor:", error);
            throw error;
        }
    }

    async loadAndSplitDocuments(directory) {
        const cacheKey = this._getCacheKey(directory);
        const cachedData = await this._loadFromCache(cacheKey);

        if (cachedData) {
            console.log("Using cached document data");
            return this._deserializeCachedData(cachedData);
        }

        try {
            const documents = await this._loadDocuments(directory);
            const chunks = await this.textSplitter.splitDocuments(documents);

            await this._saveToCache(cacheKey, { documents, chunks });
            return { documents, chunks };
        } catch (error) {
            console.error(`Failed to load documents: ${error}`);
            throw error;
        }
    }

    async search(query, maxTokens = 1000) {
        if (!query) {
            return { output: "", length: 0, tooLong: false };
        }

        try {
            const results = await this.vectorStoreManager.search(query);
            
            if (results.length > 0) {
                const result = results[0].pageContent;
                const formattedOutput = this._formatSearchResult(result);
                
                return {
                    output: formattedOutput,
                    length: formattedOutput.length,
                    tooLong: formattedOutput.length > maxTokens
                };
            }
            
            return { output: "", length: 0, tooLong: false };
        } catch (error) {
            console.error("Error searching documents:", error);
            return { output: "", length: 0, tooLong: false };
        }
    }

    async _loadDocuments(directory) {
        const files = fs.readdirSync(directory)
            .filter(file => file.toLowerCase().endsWith('.pdf'));

        if (files.length === 0) {
            throw new Error(`No PDF files found in ${directory}`);
        }

        const documents = [];
        for (const file of files) {
            const filePath = path.join(directory, file);
            const loader = new PDFLoader(filePath);
            const docs = await loader.load();
            documents.push(...docs);
        }

        return documents;
    }

    _getCacheKey(directory) {
        const directoryPath = path.resolve(directory);
        if (!fs.existsSync(directoryPath)) {
            throw new Error(`Directory not found: ${directory}`);
        }

        const paths = fs.readdirSync(directoryPath)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => path.join(directoryPath, file))
            .sort();

        if (paths.length === 0) {
            throw new Error(`No PDF files found in ${directory}`);
        }

        const latestMtime = Math.max(...paths.map(p => fs.statSync(p).mtimeMs));
        return `docs_${latestMtime}`;
    }

    async _loadFromCache(cacheKey) {
        const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
        if (fs.existsSync(cachePath)) {
            try {
                return JSON.parse(await fs.promises.readFile(cachePath, 'utf8'));
            } catch (error) {
                console.error(`Cache corruption detected: ${error}`);
                fs.unlinkSync(cachePath);
            }
        }
        return null;
    }

    async _saveToCache(cacheKey, data) {
        const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
        try {
            const serializedData = this._serializeData(data);
            await fs.promises.writeFile(cachePath, JSON.stringify(serializedData));
        } catch (error) {
            console.error(`Failed to save to cache: ${error}`);
        }
    }

    _serializeData(data) {
        const { documents, chunks } = data;
        return {
            documents: documents.map(doc => ({
                pageContent: doc.pageContent,
                metadata: doc.metadata
            })),
            chunks: chunks.map(chunk => ({
                pageContent: chunk.pageContent,
                metadata: chunk.metadata
            }))
        };
    }

    _deserializeCachedData(cachedData) {
        const { documents, chunks } = cachedData;
        return {
            documents: documents.map(doc => new Document({
                pageContent: doc.pageContent,
                metadata: doc.metadata
            })),
            chunks: chunks.map(chunk => new Document({
                pageContent: chunk.pageContent,
                metadata: chunk.metadata
            }))
        };
    }

    _formatSearchResult(result) {
        return `<context>${result}</context>`;
    }
}

module.exports = {
    DocumentProcessor
};
