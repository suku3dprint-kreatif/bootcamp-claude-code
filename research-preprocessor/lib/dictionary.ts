import type {
  ColumnStats,
  DataDictionaryRow,
  ParsedConfig,
} from "@/lib/types";

export function buildDataDictionary(
  config: ParsedConfig,
  headers: string[],
  afterStats: ColumnStats[],
  imputationByVariable: Record<string, { imputedCount: number }>,
): DataDictionaryRow[] {
  const headerSet = new Set(headers);
  const reversedCodes = new Set(config.reverseCoding.map((r) => r.variableCode));
  const outlierByCode = new Map(config.outlierRules.map((r) => [r.variableCode, r.strategy]));
  const validationByCode = new Map(config.validationRules.map((r) => [r.variableCode, r]));
  const statsByCode = new Map(afterStats.map((s) => [s.variableCode, s]));

  return config.variableMapping
    .filter((rule) => headerSet.has(rule.variableCode))
    .map((rule) => {
      const validation = validationByCode.get(rule.variableCode);
      const stats = statsByCode.get(rule.variableCode);
      return {
        variableCode: rule.variableCode,
        originalColumn: rule.originalColumn,
        label: rule.variableLabel,
        dataType: rule.dataType,
        reverseCoded: reversedCodes.has(rule.variableCode),
        outlierStrategy: outlierByCode.get(rule.variableCode) ?? null,
        min: validation?.min,
        max: validation?.max,
        required: validation?.required || rule.required,
        missingCount: stats?.missing ?? 0,
        imputedCount: imputationByVariable[rule.variableCode]?.imputedCount ?? 0,
      };
    });
}
