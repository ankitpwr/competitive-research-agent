import YahooFinance from "yahoo-finance2/src/index.ts";

export const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

export async function fetchStockInfo(symbol: string) {
  try {
    console.log("input symbol to fetch stock tool ", symbol);

    const data = await yahooFinance.quoteSummary(`${symbol}.NS`, {
      modules: [
        "assetProfile",
        "indexTrend",
        "defaultKeyStatistics",
        "industryTrend",
        "summaryDetail",
        "price",
        "summaryProfile",
        "financialData",
      ],
    });

    const filteredData = {
      companyName: data.price?.longName,
      industry: data.assetProfile?.industry,

      lastTradedPrice: data.price?.regularMarketPrice,
      openPrice: data.price?.regularMarketOpen,
      closePrice: data.price?.regularMarketPreviousClose,
      priceChange: data.price?.regularMarketChange,
      intradayHigh: data.price?.regularMarketDayHigh,
      intradayLow: data.price?.regularMarketDayLow,
      fiftyTwoWeekHigh: data.summaryDetail?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: data.summaryDetail?.fiftyTwoWeekLow,

      peRatio: data.summaryDetail?.trailingPE,
      pegRatio: data.defaultKeyStatistics?.pegRatio,
      payoutRatio: data.summaryDetail?.payoutRatio,
      quickRatio: data.financialData?.quickRatio,
      currentRatio: data.financialData?.currentRatio,

      eps: data.defaultKeyStatistics?.trailingEps,
      beta: data.summaryDetail?.beta,
      bookValue: data.defaultKeyStatistics?.bookValue,
      priceToBook: data.defaultKeyStatistics?.priceToBook,

      marketCap: data.summaryDetail?.marketCap,
      dividendRate: data.summaryDetail?.dividendRate,
      returnOnAsset: data.financialData?.returnOnAssets,
      returnOnEquity: data.financialData?.returnOnEquity,
    };

    // console.log("extract-stock-info ", filteredData);

    return {
      success: true,
      stockInfo: filteredData,
    };
  } catch (error) {
    console.log("error in extract-stock-info");
    console.log(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Stock info tool failed",
    };
  }
}

export async function fetchBalanceSheet(symbol: string, companyName: string) {
  try {
    console.log("in fetch balance sheet tool", symbol, companyName);

    const start = "2026-01-01";
    const end = new Date().toISOString().split("T")[0];
    const result = await yahooFinance.fundamentalsTimeSeries(`${symbol}.NS`, {
      period1: start,
      period2: end,
      type: "annual",
      module: "balance-sheet",
    });
    const dataWithSymbol = result.map((item) => ({
      ...item,
      symbol,
      companyName,
    }));
    return { success: true, balanceSheetData: dataWithSymbol };
  } catch (error) {
    console.error("Error fetching balance sheet:", error);
    console.log(error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Balance sheet tool failed",
    };
  }
}
