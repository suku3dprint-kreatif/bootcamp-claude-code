import type { ChangeLogEntry, ParsedConfig } from "@/lib/types";
import { isMissing, median, mode, round, toNumber } from "@/lib/transforms/stats";

const MAX_LOGGED_PER_VARIABLE = 10;

export interface ImputationResult {
  byVariable: Record<string, { method: "mean" | "median" | "mode"; imputedCount: number }>;
  changeLog: ChangeLogEntry[];
}

export function imputeMissingValues(
  rows: Record<string, unknown>[],
  headers: string[],
  config: ParsedConfig,
  droppedRowIndices: Set<number>,
): ImputationResult {
  const headerSet = new Set(headers);
  const byVariable: ImputationResult["byVariable"] = {};
  const changeLog: ChangeLogEntry[] = [];

  const activeIndices = rows
    .map((_, i) => i)
    .filter((i) => !droppedRowIndices.has(i));

  for (const rule of config.variableMapping) {
    const { variableCode, dataType } = rule;
    if (!headerSet.has(variableCode)) continue;
    if (dataType === "text") continue; // free text can't be meaningfully imputed

    const missingIndices = activeIndices.filter((i) => isMissing(rows[i][variableCode]));
    if (missingIndices.length === 0) continue;

    let fillValue: string | number | undefined;
    let method: "median" | "mode";

    if (dataType === "numeric") {
      const numericValues = activeIndices
        .map((i) => toNumber(rows[i][variableCode]))
        .filter((v): v is number => v !== null);
      if (numericValues.length === 0) continue;
      fillValue = round(median(numericValues));
      method = "median";
    } else {
      const categoricalValues = activeIndices
        .map((i) => rows[i][variableCode])
        .filter((v) => !isMissing(v)) as (string | number)[];
      if (categoricalValues.length === 0) continue;
      fillValue = mode(categoricalValues);
      method = "mode";
      if (fillValue === undefined) continue;
    }

    let loggedForVariable = 0;
    for (const rowIndex of missingIndices) {
      rows[rowIndex][variableCode] = fillValue;
      if (loggedForVariable < MAX_LOGGED_PER_VARIABLE) {
        changeLog.push({
          step: "imputation",
          variableCode,
          rowIndex,
          action: `Missing value imputed with ${method} (${fillValue}).`,
          before: null,
          after: fillValue,
        });
        loggedForVariable += 1;
      }
    }

    byVariable[variableCode] = { method, imputedCount: missingIndices.length };
  }

  return { byVariable, changeLog };
}
