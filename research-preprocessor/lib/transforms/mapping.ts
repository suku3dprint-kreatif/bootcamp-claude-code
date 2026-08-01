import type { ChangeLogEntry, ParsedConfig, RawDataset } from "@/lib/types";

export interface MappingResult {
  headers: string[];
  rows: Record<string, unknown>[];
  mappedCount: number;
  unmatchedOriginalColumns: string[];
  unmappedRawColumns: string[];
  changeLog: ChangeLogEntry[];
}

export function applyVariableMapping(
  dataset: RawDataset,
  config: ParsedConfig,
): MappingResult {
  const rawHeaderSet = new Set(dataset.headers);
  const unmatchedOriginalColumns: string[] = [];
  const usedRawColumns = new Set<string>();
  const changeLog: ChangeLogEntry[] = [];

  const applicableRules = config.variableMapping.filter((rule) => {
    const found = rawHeaderSet.has(rule.originalColumn);
    if (!found) unmatchedOriginalColumns.push(rule.originalColumn);
    else usedRawColumns.add(rule.originalColumn);
    return found;
  });

  const rows = dataset.rows.map((rawRow) => {
    const newRow: Record<string, unknown> = {};
    for (const rule of applicableRules) {
      newRow[rule.variableCode] = rawRow[rule.originalColumn] ?? null;
    }
    return newRow;
  });

  for (const rule of applicableRules) {
    changeLog.push({
      step: "mapping",
      variableCode: rule.variableCode,
      action: `Renamed column "${rule.originalColumn}" to "${rule.variableCode}".`,
    });
  }

  const unmappedRawColumns = dataset.headers.filter((h) => !usedRawColumns.has(h));

  return {
    headers: applicableRules.map((r) => r.variableCode),
    rows,
    mappedCount: applicableRules.length,
    unmatchedOriginalColumns,
    unmappedRawColumns,
    changeLog,
  };
}
