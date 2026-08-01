import type { ColumnStats, ParsedConfig } from "@/lib/types";
import { isMissing, mean, median, mode, round, stdDev, toNumber } from "@/lib/transforms/stats";

export function computeColumnStats(
  rows: Record<string, unknown>[],
  headers: string[],
  config: ParsedConfig,
): ColumnStats[] {
  const headerSet = new Set(headers);
  const stats: ColumnStats[] = [];

  for (const rule of config.variableMapping) {
    if (!headerSet.has(rule.variableCode)) continue;
    const values = rows.map((r) => r[rule.variableCode]);
    const missing = values.filter(isMissing).length;
    const present = values.length - missing;

    const entry: ColumnStats = {
      variableCode: rule.variableCode,
      originalColumn: rule.originalColumn,
      dataType: rule.dataType,
      count: present,
      missing,
    };

    if (rule.dataType === "numeric") {
      const numericValues = values
        .map(toNumber)
        .filter((v): v is number => v !== null);
      if (numericValues.length > 0) {
        entry.mean = round(mean(numericValues));
        entry.median = round(median(numericValues));
        entry.sd = round(stdDev(numericValues));
        entry.min = Math.min(...numericValues);
        entry.max = Math.max(...numericValues);
      }
    } else if (rule.dataType === "categorical") {
      const categoricalValues = values.filter((v) => !isMissing(v)) as (
        | string
        | number
      )[];
      if (categoricalValues.length > 0) {
        entry.mode = mode(categoricalValues);
      }
    }

    stats.push(entry);
  }

  return stats;
}
