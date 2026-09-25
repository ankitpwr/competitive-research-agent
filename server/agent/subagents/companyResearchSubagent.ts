import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { compnaySnapshotPrompt } from "../prompts";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,
});

const tavilySearchTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
  tavilyApiKey: process.env.TAVILY_API_KEY,
});

export async function CompanySnapshot(companyName: string) {
  const agent = createAgent({
    model,
    tools: [tavilySearchTool],
  });
  try {
    console.log("in company snapshot subagent ", companyName);
    const messages = [
      new SystemMessage(compnaySnapshotPrompt),
      new HumanMessage(`company name: ${companyName}`),
    ];

    const res = await agent.invoke({ messages });
    return res.messages.at(-1)?.text;
  } catch (error) {
    console.log("error in company snapshot ", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "fetch compnay snapshot failed",
    };
  }
}
