import type { ChangeLogEntry, OutlierStrategy, ParsedConfig } from "@/lib/types";
import { mean, median, round, stdDev, toNumber } from "@/lib/transforms/stats";

const MAX_LOGGED_PER_VARIABLE = 10;
const Z_THRESHOLD = 3;

export interface OutlierResult {
  droppedRowIndices: Set<number>;
  byVariable: Record<string, { strategy: OutlierStrategy; detected: number; handled: number }>;
  changeLog: ChangeLogEntry[];
}

/**
 * Detects outliers using mean +/- 3 SD (z-score > 3) and applies the
 * configured handling strategy. Rows marked for "drop" are only recorded
 * here; the caller removes them once every variable has been processed so
 * row indices stay stable across variables.
 */
export function detectAndHandleOutliers(
  rows: Record<string, unknown>[],
  headers: string[],
  config: ParsedConfig,
): OutlierResult {
  const headerSet = new Set(headers);
  const dataTypeByCode = new Map(
    config.variableMapping.map((rule) => [rule.variableCode, rule.dataType]),
  );

  const droppedRowIndices = new Set<number>();
  const byVariable: OutlierResult["byVariable"] = {};
  const changeLog: ChangeLogEntry[] = [];

  for (const rule of config.outlierRules) {
    const { variableCode, strategy } = rule;
    if (!headerSet.has(variableCode)) continue;
    if (dataTypeByCode.get(variableCode) !== "numeric") continue;

    const numericEntries: { rowIndex: number; value: number }[] = [];
    rows.forEach((row, rowIndex) => {
      const num = toNumber(row[variableCode]);
      if (num !== null) numericEntries.push({ rowIndex, value: num });
    });

    if (numericEntries.length < 2) {
      byVariable[variableCode] = { strategy, detected: 0, handled: 0 };
      continue;
    }

    const values = numericEntries.map((e) => e.value);
    const m = mean(values);
    const sd = stdDev(values);

    if (sd === 0) {
      byVariable[variableCode] = { strategy, detected: 0, handled: 0 };
      continue;
    }

    const lower = m - Z_THRESHOLD * sd;
    const upper = m + Z_THRESHOLD * sd;

    const flagged = numericEntries.filter((e) => e.value < lower || e.value > upper);
    const cleanValues = numericEntries
      .filter((e) => e.value >= lower && e.value <= upper)
      .map((e) => e.value);
    const fallbackValues = cleanValues.length > 0 ? cleanValues : values;

    let handled = 0;
    let loggedForVariable = 0;
    const logChange = (rowIndex: number, action: string, before: unknown, after?: unknown) => {
      if (loggedForVariable < MAX_LOGGED_PER_VARIABLE) {
        changeLog.push({ step: "outliers", variableCode, rowIndex, action, before, after });
        loggedForVariable += 1;
      }
    };

    for (const entry of flagged) {
      switch (strategy) {
        case "keep":
          break;
        case "drop":
          droppedRowIndices.add(entry.rowIndex);
          handled += 1;
          logChange(entry.rowIndex, `Row dropped: outlier value ${entry.value}.`, entry.value);
          break;
        case "cap_3sd": {
          const capped = entry.value > upper ? round(upper) : round(lower);
          rows[entry.rowIndex][variableCode] = capped;
          handled += 1;
          logChange(
            entry.rowIndex,
            `Capped outlier to ${entry.value > upper ? "upper" : "lower"} 3SD bound.`,
            entry.value,
            capped,
          );
          break;
        }
        case "impute_mean": {
          const filled = round(mean(fallbackValues));
          rows[entry.rowIndex][variableCode] = filled;
          handled += 1;
          logChange(entry.rowIndex, "Outlier replaced with column mean.", entry.value, filled);
          break;
        }
        case "impute_median": {
          const filled = round(median(fallbackValues));
          rows[entry.rowIndex][variableCode] = filled;
          handled += 1;
          logChange(entry.rowIndex, "Outlier replaced with column median.", entry.value, filled);
          break;
        }
      }
    }

    byVariable[variableCode] = { strategy, detected: flagged.length, handled };
  }

  return { droppedRowIndices, byVariable, changeLog };
}
