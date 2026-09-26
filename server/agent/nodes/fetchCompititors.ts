import { TavilySearch } from "@langchain/tavily";
import type { StateType } from "../agent";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { competitorDiscoveryPrompt } from "../prompts";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { fetchCompititorsTool, symbolTool } from "../tools/tool.registry";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { reportActivity } from "../subagents/activity";

const tavilySearchTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
  tavilyApiKey: process.env.TAVILY_API_KEY,
});

const competitorSearchTool = tool(
  async ({ query }: { query: string }) => tavilySearchTool.invoke({ query }),
  {
    name: "tavily_competitor_search",
    description:
      "Search the web for reliable information about company competitors.",
    schema: z.object({
      query: z.string().min(1).describe("The web search query"),
    }),
  },
);

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,
});

const structuredResponse = z.object({
  symbolofTargetCompany: z
    .string()
    .default("")
    .describe(
      "The verified NSE ticker returned by symbol_extractor_tool for the target company, or an empty string when no usable ticker was found.",
    ),
  competitors: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            "Full legal or commonly used company name; never a category",
          ),
        symbol: z
          .string()
          .optional()
          .describe("NSE/Yahoo ticker when verified, otherwise null"),
      }),
    )
    .max(3)
    .describe("Two or three verified direct or adjacent competitors"),
});

const agent = createAgent({
  model,
  tools: [symbolTool, fetchCompititorsTool, competitorSearchTool],
  responseFormat: structuredResponse,
});

export async function fetchCompititors(
  state: StateType,
  config: LangGraphRunnableConfig,
) {
  reportActivity(
    config,
    "node",
    "fetch_competitors",
    "start",
    `Finding competitors for ${state.company}`,
  );
  try {
    const messages = [
      new SystemMessage(competitorDiscoveryPrompt),
      new HumanMessage(`company: ${state.company}`),
    ];

    const response = await agent.invoke({ messages }, config);

    const competitors = response.structuredResponse.competitors.map(
      ({ name, symbol }) => (symbol ? `${name} (${symbol})` : name),
    );

    if (response.structuredResponse.symbolofTargetCompany) {
      reportActivity(
        config,
        "node",
        "fetch_competitors",
        "complete",
        "Competitor shortlist ready",
      );
      return {
        competitors,
        targetCompanySymbol: response.structuredResponse.symbolofTargetCompany,
      };
    }
    reportActivity(
      config,
      "node",
      "fetch_competitors",
      "complete",
      "Competitor shortlist ready",
    );
    return { competitors };
  } catch (error) {
    reportActivity(
      config,
      "node",
      "fetch_competitors",
      "complete",
      "Competitor discovery failed",
    );
    return {
      error: error instanceof Error ? error.message : "fetch Compititor failed",
    };
  }
}
