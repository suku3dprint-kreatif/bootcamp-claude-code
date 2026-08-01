import { describe, expect, it } from "vitest";

import { runProcessing } from "@/lib/processor";
import type { ParsedConfig, RawDataset } from "@/lib/types";

// Math.min(...values) / Math.max(...values) throws "Maximum call stack size
// exceeded" once `values` gets into the tens of thousands (spread arguments
// go through the call stack). The 50MB raw-file target in the spec implies
// datasets in that range, so this guards against that regression.
const N_ROWS = 200_000;

function buildLargeDataset(): RawDataset {
  const headers = ["score", "group"];
  const rows = Array.from({ length: N_ROWS }, (_, i) => ({
    score: i === 0 ? -500 : i === N_ROWS - 1 ? 999 : (i % 5) + 1,
    group: i % 3 === 0 ? "A" : "B",
  }));
  return { headers, rows, sourceFileName: "large.csv" };
}

const config: ParsedConfig = {
  variableMapping: [
    { originalColumn: "score", variableCode: "SCORE", variableLabel: "Score", dataType: "numeric", required: true },
    { originalColumn: "group", variableCode: "GROUP", variableLabel: "Group", dataType: "categorical", required: false },
  ],
  reverseCoding: [],
  outlierRules: [{ variableCode: "SCORE", strategy: "cap_3sd" }],
  validationRules: [{ variableCode: "SCORE", min: 1, max: 5, required: true }],
  warnings: [],
};

describe("runProcessing at scale", () => {
  it(`handles ${N_ROWS.toLocaleString()} rows without crashing and computes correct min/max`, () => {
    const dataset = buildLargeDataset();
    const start = performance.now();

    const result = runProcessing(dataset, config, {
      rawFileName: "large.csv",
      configFileName: "config.xlsx",
    });

    const elapsedMs = performance.now() - start;

    expect(result.cleanRows.length).toBe(N_ROWS);
    // The extreme -500 and 999 values should have been capped by cap_3sd,
    // not left as the raw min/max.
    const scoreStats = result.report.afterStats.find((s) => s.variableCode === "SCORE");
    expect(scoreStats?.min).toBeGreaterThan(-500);
    expect(scoreStats?.max).toBeLessThan(999);
    expect(elapsedMs).toBeLessThan(5000);
  });
});
