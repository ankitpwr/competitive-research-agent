import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { compnaySnapshotPrompt } from "../prompts";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { reportActivity } from "./activity";

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

export async function CompanySnapshot(
  companyName: string,
  config: LangGraphRunnableConfig,
) {
  const agent = createAgent({
    model,
    tools: [tavilySearchTool],
  });
  try {
    reportActivity(
      config,
      "subagent",
      "company_snapshot_researcher",
      "start",
      `Researching the business profile of ${companyName}`,
    );
    const messages = [
      new SystemMessage(compnaySnapshotPrompt),
      new HumanMessage(`company name: ${companyName}`),
    ];

    const res = await agent.invoke({ messages }, config);
    const result = res.messages.at(-1)?.text;
    reportActivity(
      config,
      "subagent",
      "company_snapshot_researcher",
      "complete",
      `Business profile ready for ${companyName}`,
    );
    console.log(`[subagent:company_snapshot] response: ${result}\n`);

    return result;
  } catch (error) {
    reportActivity(
      config,
      "subagent",
      "company_snapshot_researcher",
      "complete",
      `Business profile research failed for ${companyName}`,
    );
    return {
      error:
        error instanceof Error
          ? error.message
          : "fetch compnay snapshot failed",
    };
  }
}
