import type { ParsedConfig, ValidationIssue } from "@/lib/types";
import { isMissing, toNumber } from "@/lib/transforms/stats";

export function validateData(
  rows: Record<string, unknown>[],
  headers: string[],
  config: ParsedConfig,
  droppedRowIndices: Set<number>,
): ValidationIssue[] {
  const headerSet = new Set(headers);
  const issues: ValidationIssue[] = [];

  const requiredByCode = new Map(
    config.variableMapping.map((rule) => [rule.variableCode, rule.required]),
  );
  const rangeByCode = new Map(
    config.validationRules.map((rule) => [
      rule.variableCode,
      { min: rule.min, max: rule.max, required: rule.required },
    ]),
  );

  const codes = config.variableMapping
    .map((rule) => rule.variableCode)
    .filter((code) => headerSet.has(code));

  rows.forEach((row, rowIndex) => {
    if (droppedRowIndices.has(rowIndex)) return;

    for (const code of codes) {
      const value = row[code];
      const range = rangeByCode.get(code);
      const required = range?.required || requiredByCode.get(code) || false;

      if (required && isMissing(value)) {
        issues.push({
          variableCode: code,
          rowIndex,
          message: `"${code}" is required but missing.`,
          severity: "error",
        });
        continue;
      }

      if (!range || isMissing(value)) continue;

      const num = toNumber(value);
      if (num === null) continue;
      if (range.min !== undefined && num < range.min) {
        issues.push({
          variableCode: code,
          rowIndex,
          message: `"${code}" value ${num} is below minimum ${range.min}.`,
          severity: "warning",
        });
      } else if (range.max !== undefined && num > range.max) {
        issues.push({
          variableCode: code,
          rowIndex,
          message: `"${code}" value ${num} is above maximum ${range.max}.`,
          severity: "warning",
        });
      }
    }
  });

  return issues;
}
