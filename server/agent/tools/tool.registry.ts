import { tool } from "@langchain/core/tools";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { fetchBalanceSheet, fetchStockInfo } from "./financial.tools";
import { z } from "zod";
import { getSymbol } from "./symbol.tools";
import { fetchCompititors } from "./compititor.tool";
import { financialSubagent } from "../subagents/financialSubagent";
import { CompanySnapshot } from "../subagents/companyResearchSubagent";
import { reportActivity } from "../subagents/activity";

export const stockInfoTool = tool(
  async ({ symbol }: { symbol: string }, config: LangGraphRunnableConfig) => {
    try {
      reportActivity(
        config,
        "tool",
        "get_stock_financial_metrics",
        "start",
        `Reading market metrics for ${symbol}`,
      );
      const data = await fetchStockInfo(symbol);
      reportActivity(
        config,
        "tool",
        "get_stock_financial_metrics",
        "complete",
        `Market metrics received for ${symbol}`,
      );
      return JSON.stringify(data?.stockInfo);
    } catch (error) {
      return `Tool failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  },
  {
    name: "get_stock_financial_metrics",
    description:
      "Fetch current market data and key valuation, profitability, liquidity, and risk ratios for a verified NSE-listed stock. Use the symbol without the .NS suffix.",
    schema: z.object({
      symbol: z
        .string()
        .min(1)
        .describe(
          "A verified NSE stock ticker without .NS, for example RELIANCE or INFY.",
        ),
    }),
  },
);

export const balanceSheetTool = tool(
  async (
    {
      symbol,
      companyName,
    }: {
      symbol: string;
      companyName: string;
      period1?: string;
      period2?: string;
    },
    config: LangGraphRunnableConfig,
  ) => {
    try {
      reportActivity(
        config,
        "tool",
        "get_balance_sheet",
        "start",
        `Reading balance sheet for ${symbol}`,
      );
      const data = await fetchBalanceSheet(symbol, companyName);
      reportActivity(
        config,
        "tool",
        "get_balance_sheet",
        "complete",
        `Balance sheet received for ${symbol}`,
      );
      return JSON.stringify(data);
    } catch (error) {
      reportActivity(
        config,
        "tool",
        "get_balance_sheet",
        "complete",
        `Balance sheet retrieval failed for ${symbol}`,
      );
      return `Tool failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  },
  {
    name: "get_balance_sheet",
    description:
      "Fetch annual balance-sheet time-series data for a verified NSE-listed stock. Use this for assets, liabilities, equity, and other balance-sheet evidence.",
    schema: z.object({
      symbol: z
        .string()
        .min(1)
        .describe(
          "A verified NSE stock ticker without .NS, for example RELIANCE or INFY.",
        ),
      companyName: z
        .string()
        .min(1)
        .describe(
          "The full company name corresponding to the symbol, for example Reliance Industries.",
        ),
    }),
  },
);

export const symbolTool = tool(
  async ({ company }: { company: string }, config: LangGraphRunnableConfig) => {
    try {
      reportActivity(
        config,
        "tool",
        "symbol_extractor_tool",
        "start",
        `Resolving the ticker for ${company}`,
      );
      const data = await getSymbol(company);
      reportActivity(
        config,
        "tool",
        "symbol_extractor_tool",
        "complete",
        `Ticker lookup complete for ${company}`,
      );
      return JSON.stringify(data);
    } catch (error) {
      return `Tool failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  },
  {
    name: "symbol_extractor_tool",
    description:
      "Resolve a company name to its NSE-listed equity symbol. Call this before using any stock or peer tool. If the company is not listed or no reliable match exists, the result contains no usable symbol.",
    schema: z.object({
      company: z
        .string()
        .min(1)
        .describe(
          'The complete company name to resolve, for example "Reliance Industries" or "Infosys".',
        ),
    }),
  },
);

export const fetchCompititorsTool = tool(
  async ({ symbol }: { symbol: string }, config: LangGraphRunnableConfig) => {
    try {
      reportActivity(
        config,
        "tool",
        "fetch_stocks_peers_information",
        "start",
        `Looking up peers for ${symbol}`,
      );
      const data = await fetchCompititors(symbol);
      reportActivity(
        config,
        "tool",
        "fetch_stocks_peers_information",
        "complete",
        `Peer lookup complete for ${symbol}`,
      );
      return JSON.stringify(data);
    } catch (error) {
      return `Tool failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  },
  {
    name: "fetch_stocks_peers_information",
    description:
      "Fetch NSE industry peers for a verified NSE equity symbol. Use this only after symbol_extractor_tool succeeds. The result includes peer company names and Yahoo/NSE-compatible symbols; a failed request or empty peer list must be treated as a tool failure.",
    schema: z.object({
      symbol: z
        .string()
        .min(1)
        .describe(
          "A verified NSE equity symbol without the .NS suffix, for example RELIANCE or INFY.",
        ),
    }),
  },
);

export const financialSubagentTool = tool(
  async (
    {
      task,
      symbol,
      companyName,
    }: { task: string; symbol: string; companyName: string },
    config: LangGraphRunnableConfig,
  ) => {
    try {
      reportActivity(
        config,
        "subagent",
        "financial_research_subagent",
        "start",
        `Financial research started for ${companyName}`,
      );
      if (!symbol.trim()) {
        return "Tool failed: a verified stock symbol is required for financial research";
      }
      const data = await financialSubagent(companyName, symbol, task, config);
      reportActivity(
        config,
        "subagent",
        "financial_research_subagent",
        "complete",
        `Financial research complete for ${companyName}`,
      );
      return JSON.stringify(data);
    } catch (error) {
      return `Tool failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  },
  {
    name: "financial_research_subagent",
    description:
      "Delegate financial research for one stock-listed company. The subagent uses stock metrics and balance-sheet tools and returns a concise 6 to 10 line financial summary. Only call this when a verified non-empty stock symbol is available.",
    schema: z.object({
      task: z
        .string()
        .min(1)
        .describe(
          "The specific financial question or scope, for example: summarize valuation and balance-sheet health.",
        ),
      symbol: z
        .string()
        .min(1)
        .describe(
          "A verified NSE stock ticker without .NS; this field is mandatory, for example RELIANCE.",
        ),
      companyName: z
        .string()
        .min(1)
        .describe(
          "The full company name corresponding to the symbol, for example Reliance Industries.",
        ),
    }),
  },
);

export const companySnapshotSubagentTool = tool(
  async (
    { companyName }: { companyName: string },
    config: LangGraphRunnableConfig,
  ) => {
    try {
      reportActivity(
        config,
        "tool",
        "company_snapshot_subagent",
        "start",
        `Delegating company snapshot for ${companyName}`,
      );
      const data = await CompanySnapshot(companyName, config);
      reportActivity(
        config,
        "tool",
        "company_snapshot_subagent",
        "complete",
        `Company snapshot returned for ${companyName}`,
      );
      return JSON.stringify(data);
    } catch (error) {
      reportActivity(
        config,
        "tool",
        "company_snapshot_subagent",
        "complete",
        `Company snapshot failed for ${companyName}`,
      );
      return `Tool failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  },
  {
    name: "company_snapshot_subagent",
    description:
      "Delegate qualitative research for one company. The subagent uses web search and returns a concise 6 to 10 line profile covering what the company does, sector, business model, target market, regions, ownership, and sourced scale signals. This tool does not require a stock symbol.",
    schema: z.object({
      companyName: z
        .string()
        .min(1)
        .describe(
          "The full company name to research, for example Reliance Industries or Stripe.",
        ),
    }),
  },
);
