import { tool } from "@langchain/core/tools";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { fetchBalanceSheet, fetchStockInfo } from "./financial.tools";
import { z } from "zod";
import { getSymbol } from "./symbol.tools";
import { fetchCompititors } from "./compititor.tool";
import { financialSubagent } from "../subagents/financialSubagent";
import { CompanySnapshot } from "../subagents/companyResearchSubagent";

export const stockInfoTool = tool(
  async ({ symbol }: { symbol: string }, config: LangGraphRunnableConfig) => {
    try {
      config.writer?.({
        status: `Analyzing key ratios and intraday metrics for ${symbol}...`,
      });
      const data = await fetchStockInfo(symbol);
      return JSON.stringify(data?.stockInfo);
    } catch (error) {
      console.log("error in stock info tool ", error);
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
      config.writer?.({
        status: `Retrieving balance sheet statements for ${symbol}...`,
      });
      const data = await fetchBalanceSheet(symbol, companyName);
      return JSON.stringify(data);
    } catch (error) {
      console.log("error in balance sheet tool ", error);
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
      config.writer?.({
        status: `Looking for ticker symbol for ${company}...`,
      });
      const data = await getSymbol(company);
      return JSON.stringify(data);
    } catch (error) {
      console.log("error in symbol tool ", error);
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
      config.writer?.({
        status: `Identifying industry peers and competitors for ${symbol}...`,
      });
      const data = await fetchCompititors(symbol);
      return JSON.stringify(data);
    } catch (error) {
      console.log("error in peers info tool ", error);
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
      config.writer?.({
        status: `Performing fundamental analysis for ${companyName}...`,
      });
      if (!symbol.trim()) {
        return "Tool failed: a verified stock symbol is required for financial research";
      }
      const data = await financialSubagent(companyName, symbol, task);
      return JSON.stringify(data);
    } catch (error) {
      console.log("error in fundamental subagent tool ", error);
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
      config.writer?.({
        status: `Building a company snapshot for ${companyName}...`,
      });
      const data = await CompanySnapshot(companyName);
      return JSON.stringify(data);
    } catch (error) {
      console.log("error in company snapshot subagent tool ", error);
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
