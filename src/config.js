const config = {
  MicrosoftAppId: process.env.BOT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.BOT_TENANT_ID,
  MicrosoftAppPassword: process.env.BOT_PASSWORD,
  openAIKey: process.env.OPENAI_API_KEY,
  openAIModelName: "gpt-4o-mini",
  cache_dir: "src/cache",
  data_dir: "src/data",
  embeddings_dir: "../../embeddings",
  embedding_chunk_size: 3000,
  embedding_chunk_overlap: 200,
  memory_window: 5,
  relevance_threshold: 0.75,
};

module.exports = config;
