const { MemoryStorage } = require("botbuilder");
const path = require("path");
const config = require("../config");

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
const { Application, ActionPlanner, OpenAIModel, PromptManager } = require("@microsoft/teams-ai");
const { MyDataSource } = require("./myDataSource");

// Create AI components
const model = new OpenAIModel({
  apiKey: config.openAIKey,
  defaultModel: config.openAIModelName,
  useSystemMessages: true,
  logRequests: true,
});

const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../prompts"),
});

const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "chat",
});

// Register your data source with planner
const myDataSource = new MyDataSource("my-ai-search");

// Initialize the data source before adding it to the planner
async function initializeApp() {
  try {
      await myDataSource.init();  // Ensure vector store is initialized
      planner.prompts.addDataSource(myDataSource);  // Add after initialization
  } catch (err) {
      console.error("Failed to initialize data source:", err);
  }
}

initializeApp();  // Call this function to start everything

// Define storage and application
const storage = new MemoryStorage();

const app = new Application({
  storage,
  ai: {
    planner,
  },
});

module.exports = app;