import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { balanceSheetTool, stockInfoTool } from "../tools/tool.registry";
import { financialAgentPrompt } from "../prompts";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { reportActivity } from "./activity";

export async function financialSubagent(
  companyName: string,
  symbol: string,
  task: string,
  config: LangGraphRunnableConfig,
) {
  reportActivity(
    config,
    "subagent",
    "financial_researcher",
    "start",
    `Gathering financial evidence for ${companyName}`,
  );
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    maxRetries: 2,
    apiKey: process.env.GOOGLE_API_KEY,
  });
  const agent = createAgent({
    model,
    tools: [balanceSheetTool, stockInfoTool],
  });
  try {
    const messages = [
      new SystemMessage(financialAgentPrompt),
      new HumanMessage(
        `task: ${task}\nsymbol: ${symbol}\ncompanyName: ${companyName}`,
      ),
    ];
    const res = await agent.invoke({ messages }, config);
    const result = res.messages.at(-1)?.text;
    reportActivity(
      config,
      "subagent",
      "financial_researcher",
      "complete",
      `Financial evidence ready for ${companyName}`,
    );
    console.log(`[subagent:financial_research] response: ${result}\n`);
    return result;
  } catch (error) {
    reportActivity(
      config,
      "subagent",
      "financial_researcher",
      "complete",
      `Financial research failed for ${companyName}`,
    );
    return {
      error: error instanceof Error ? error.message : "fetch Compititor failed",
    };
  }
}
