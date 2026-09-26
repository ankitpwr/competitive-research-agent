import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { StateType } from "../agent";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import {
  companySnapshotSubagentTool,
  financialSubagentTool,
} from "../tools/tool.registry";
import { orchestratorSystemPrompt } from "../prompts";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { reportActivity } from "../subagents/activity";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,
});
const agent = createAgent({
  model,
  tools: [financialSubagentTool, companySnapshotSubagentTool],
});
export async function orchestrator(
  state: StateType,
  config: LangGraphRunnableConfig,
) {
  reportActivity(
    config,
    "node",
    "orchestrator",
    "start",
    "Planning research across the company set",
  );
  try {
    const messages = [
      new SystemMessage(orchestratorSystemPrompt),
      new HumanMessage(
        `companyName: ${state.company}\ncompetitors: ${state.competitors.join(", ")}\ntargetCompanySymbol: ${state.targetCompanySymbol}`,
      ),
    ];
    const response = await agent.invoke({ messages }, config);
    reportActivity(
      config,
      "node",
      "orchestrator",
      "complete",
      "Research dispatch complete",
    );
    return { messages: response.messages };
  } catch (error) {
    reportActivity(
      config,
      "node",
      "orchestrator",
      "complete",
      "Research dispatch failed",
    );
    return {
      error: error instanceof Error ? error.message : "fetch Compititor failed",
    };
  }
}
