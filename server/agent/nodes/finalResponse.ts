import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { StateType } from "../agent";
import { HumanMessage, SystemMessage } from "langchain";
import { finalResponsePrompt } from "../prompts";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,
});
export async function finalResponse(state: StateType) {
  try {
    const messages = [
      new SystemMessage(finalResponsePrompt),
      new HumanMessage(
        `company name: ${state.company}\ncompetitors: ${state.competitors.join(", ")}\nsubagent messages: ${JSON.stringify(state.messages)}`,
      ),
    ];
    const response = await model.invoke(messages);
    return { finalSummary: response.content };
  } catch (error) {
    console.log("error in final response ", error);
    return {
      error: error instanceof Error ? error.message : "final response failed",
    };
  }
}
