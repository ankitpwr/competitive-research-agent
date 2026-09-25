import { tool } from "@langchain/core/tools";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { nseClient } from "../../lib/apiClient";

export async function getSymbol(company: string) {
  try {
    console.log("input to getSymbol tool ", company);

    const url =
      `NextApi/globalSearch/equity?symbol=` + encodeURIComponent(company);
    const { data } = await nseClient.get(url);

    const results = data["data"] ?? [];

    if (!Array.isArray(results) || results.length === 0) {
      return results;
    }

    const eqOnly = results.filter((r: any) => r.series === "EQ");
    const filtered = eqOnly.length > 0 ? eqOnly : results;

    // console.log("filtered response from getSymbol tool", filtered);
    return { success: true, possibleSymbols: filtered };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "symbol tool failed",
    };
  }
}
