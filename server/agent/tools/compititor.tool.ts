import { nseClient } from "../../lib/apiClient";
import { yahooFinance } from "./financial.tools";

export async function fetchCompititors(symbol: string) {
  try {
    const { data } = await nseClient.get(
      `/NextApi/apiClient/GetQuoteApi?functionName=getPeerComparisonData&symbol=${symbol}&type=S&quarter=2025-12&param=industry&index=`,
    );
    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        competitors: [],
        error: "No peers returned by NSE",
      };
    }

    const competitors = await Promise.all(
      data.map(async (peer: { symbol?: string }) => {
        if (!peer.symbol) return null;

        const quote = await yahooFinance.quoteSummary(`${peer.symbol}.NS`, {
          modules: ["price"],
        });
        const name = quote.price?.longName;
        const symbol = quote.price?.symbol;
        return name ? { name, symbol: symbol ?? null } : null;
      }),
    );

    const usableCompetitors = competitors.filter(
      (competitor): competitor is { name: string; symbol: string | null } =>
        competitor !== null,
    );

    if (usableCompetitors.length === 0) {
      return {
        success: false,
        competitors: [],
        error: "NSE peers had no usable company details",
      };
    }

    return {
      success: true,
      competitors: usableCompetitors,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Peers tool failed",
    };
  }
}
