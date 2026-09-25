import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { balanceSheetTool, stockInfoTool } from "../tools/tool.registry";
import { financialAgentPrompt } from "../prompts";

export async function financialSubagent(
  companyName: string,
  symbol: string,
  task: string,
) {
  console.log("in financial subagent ", companyName, symbol);
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
    const res = await agent.invoke({ messages });
    return res.messages.at(-1)?.text;
  } catch (error) {
    console.log("error in orchestrator ", error);
    return {
      error: error instanceof Error ? error.message : "fetch Compititor failed",
    };
  }
}
