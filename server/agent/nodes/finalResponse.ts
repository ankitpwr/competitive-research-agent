import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { StateType } from "../agent";
import { HumanMessage, SystemMessage } from "langchain";
import { finalResponsePrompt } from "../prompts";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { reportActivity } from "../subagents/activity";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,
});
export async function finalResponse(
  state: StateType,
  config: LangGraphRunnableConfig,
) {
  reportActivity(
    config,
    "node",
    "final_response",
    "start",
    "Writing the final comparison",
  );
  try {
    const messages = [
      new SystemMessage(finalResponsePrompt),
      new HumanMessage(
        `company name: ${state.company}\ncompetitors: ${state.competitors.join(", ")}\nsubagent messages: ${JSON.stringify(state.messages)}`,
      ),
    ];
    const response = await model.invoke(messages, config);
    console.log(`[final] response: ${response.content}\n`);
    reportActivity(
      config,
      "node",
      "final_response",
      "complete",
      "Final comparison ready",
    );
    return { finalSummary: response.content };
  } catch (error) {
    reportActivity(
      config,
      "node",
      "final_response",
      "complete",
      "Final comparison failed",
    );
    return {
      error: error instanceof Error ? error.message : "final response failed",
    };
  }
}
