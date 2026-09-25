import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
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

export async function startAgent(companyName: string) {
  const res = await competitorGraph.invoke({ company: companyName });
  return res.finalSummary;
}
