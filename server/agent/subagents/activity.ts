import type { LangGraphRunnableConfig } from "@langchain/langgraph";

export type ActivitySource = "node" | "subagent" | "tool";

export function reportActivity(
  config: LangGraphRunnableConfig,
  source: ActivitySource,
  name: string,
  phase: "start" | "complete",
  label: string,
) {
  const activity = {
    type: "activity",
    source,
    name,
    phase,
    label,
  } as const;

  console.log(`[${source}] ${phase}: ${label}`);
  config.writer?.(activity);
}
