import {
  END,
  START,
  StateGraph,
  StateSchema,
  type StreamMode,
} from "@langchain/langgraph";
import { z } from "zod";
import { fetchCompititors } from "./nodes/fetchCompititors";
import { orchestrator } from "./nodes/orchestrator";
import { finalResponse } from "./nodes/finalResponse";

const State = new StateSchema({
  company: z.string(),
  targetCompanySymbol: z.string().default(""),
  competitors: z.array(z.string()).default([]),
  messages: z.array(z.unknown()).default([]),
  finalSummary: z.string(),
});

export interface StateType {
  company: string;
  targetCompanySymbol: string;
  competitors: string[];
  messages: unknown[];
}

const graph = new StateGraph(State)
  .addNode("fetch_competitors", fetchCompititors)
  .addNode("orchestrator", orchestrator)
  .addNode("finalResponse", finalResponse)
  .addEdge(START, "fetch_competitors")
  .addEdge("fetch_competitors", "orchestrator")
  .addEdge("orchestrator", "finalResponse")
  .addEdge("finalResponse", END);

export const competitorGraph = graph.compile();

const streamConfig: { streamMode: StreamMode[]; subgraphs: boolean } = {
  streamMode: ["updates", "custom"],
  subgraphs: true,
};

export async function* streamAgent(companyName: string) {
  console.log("Input company ", companyName);
  const stream = await competitorGraph.stream(
    { company: companyName },
    streamConfig,
  );

  for await (const event of stream) {
    yield event;
  }
}

export async function startAgent(companyName: string) {
  const res = await competitorGraph.invoke({ company: companyName });
  return res.finalSummary;
}
