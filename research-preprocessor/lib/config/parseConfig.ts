import * as XLSX from "xlsx";
import type {
  ConfigParseResult,
  DataType,
  OutlierRule,
  OutlierStrategy,
  ParsedConfig,
  ReverseCodingRule,
  ValidationRule,
  VariableMappingRule,
} from "@/lib/types";

export const REQUIRED_TABS = [
  "Instructions",
  "Variable Mapping",
  "Reverse Coding",
  "Outlier Rules",
  "Validation",
  "Processing Log",
] as const;

const OUTLIER_STRATEGIES: OutlierStrategy[] = [
  "keep",
  "drop",
  "cap_3sd",
  "impute_mean",
  "impute_median",
];

type RawRow = Record<string, unknown>;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findSheet(
  workbook: XLSX.WorkBook,
  tabName: string,
): XLSX.WorkSheet | undefined {
  const target = normalizeKey(tabName);
  const match = workbook.SheetNames.find((name) => normalizeKey(name) === target);
  return match ? workbook.Sheets[match] : undefined;
}

function sheetToRows(sheet: XLSX.WorkSheet): RawRow[] {
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null, raw: true });
}

function getField(row: RawRow, aliases: string[]): unknown {
  const normalizedRow: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    normalizedRow[normalizeKey(key)] = row[key];
  }
  for (const alias of aliases) {
    const value = normalizedRow[normalizeKey(alias)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str === "" ? undefined : str;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : undefined;
}

function toBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  const str = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1", "required"].includes(str)) return true;
  if (["no", "n", "false", "0", "optional"].includes(str)) return false;
  return defaultValue;
}

function normalizeDataType(value: unknown, warnings: string[], variableCode: string): DataType {
  const str = toStringOrUndefined(value)?.toLowerCase();
  if (str === "numeric" || str === "number") return "numeric";
  if (str === "categorical" || str === "category" || str === "ordinal") return "categorical";
  if (str === "text" || str === "string") return "text";
  warnings.push(
    `Variable Mapping: "${variableCode}" has missing/unrecognized data_type ("${value ?? ""}"), defaulting to "numeric".`,
  );
  return "numeric";
}

export function parseConfigWorkbook(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
): ConfigParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let workbook: XLSX.WorkBook;
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    workbook = XLSX.read(bytes, { type: "array" });
  } catch {
    return {
      config: null,
      errors: [
        `Could not read "${fileName}" as an Excel file. Make sure it is a valid .xlsx file.`,
      ],
      warnings,
    };
  }

  const missingTabs = REQUIRED_TABS.filter((tab) => !findSheet(workbook, tab));
  if (missingTabs.length > 0) {
    errors.push(
      `Config file is missing required tab(s): ${missingTabs.join(", ")}. All 6 tabs (${REQUIRED_TABS.join(", ")}) are required.`,
    );
    return { config: null, errors, warnings };
  }

  // ---- Variable Mapping ----
  const mappingSheet = findSheet(workbook, "Variable Mapping")!;
  const mappingRows = sheetToRows(mappingSheet);
  const variableMapping: VariableMappingRule[] = [];
  const seenCodes = new Set<string>();
  const seenColumns = new Set<string>();

  for (const row of mappingRows) {
    const originalColumn = toStringOrUndefined(
      getField(row, ["original_column", "original", "column", "raw_column", "source_column"]),
    );
    const variableCode = toStringOrUndefined(
      getField(row, ["variable_code", "code", "var_code", "short_code"]),
    );
    if (!originalColumn || !variableCode) {
      if (originalColumn || variableCode) {
        warnings.push(
          `Variable Mapping: skipped a row missing "original_column" or "variable_code" (original_column="${originalColumn ?? ""}", variable_code="${variableCode ?? ""}").`,
        );
      }
      continue;
    }
    if (seenCodes.has(variableCode)) {
      errors.push(`Variable Mapping: duplicate variable_code "${variableCode}".`);
      continue;
    }
    if (seenColumns.has(originalColumn)) {
      warnings.push(
        `Variable Mapping: original_column "${originalColumn}" is mapped more than once.`,
      );
    }
    seenCodes.add(variableCode);
    seenColumns.add(originalColumn);

    const variableLabel =
      toStringOrUndefined(getField(row, ["variable_label", "label", "description"])) ??
      variableCode;
    const dataType = normalizeDataType(
      getField(row, ["data_type", "type"]),
      warnings,
      variableCode,
    );
    const required = toBoolean(getField(row, ["required", "is_required"]), false);

    variableMapping.push({ originalColumn, variableCode, variableLabel, dataType, required });
  }

  if (variableMapping.length === 0) {
    errors.push(
      `Variable Mapping tab has no usable rows. Each row needs at least "original_column" and "variable_code".`,
    );
  }

  const knownCodes = new Set(variableMapping.map((v) => v.variableCode));

  // ---- Reverse Coding ----
  const reverseSheet = findSheet(workbook, "Reverse Coding")!;
  const reverseRows = sheetToRows(reverseSheet);
  const reverseCoding: ReverseCodingRule[] = [];
  for (const row of reverseRows) {
    const variableCode = toStringOrUndefined(
      getField(row, ["variable_code", "code", "var_code"]),
    );
    if (!variableCode) continue;
    const scaleMax = toNumberOrUndefined(
      getField(row, ["scale_max", "max", "likert_max"]),
    );
    if (scaleMax === undefined) {
      warnings.push(
        `Reverse Coding: "${variableCode}" is missing a numeric scale_max, skipping.`,
      );
      continue;
    }
    const scaleMin =
      toNumberOrUndefined(getField(row, ["scale_min", "min", "likert_min"])) ?? 1;
    if (!knownCodes.has(variableCode)) {
      warnings.push(
        `Reverse Coding: "${variableCode}" is not defined in Variable Mapping and will be ignored.`,
      );
      continue;
    }
    reverseCoding.push({ variableCode, scaleMin, scaleMax });
  }

  // ---- Outlier Rules ----
  const outlierSheet = findSheet(workbook, "Outlier Rules")!;
  const outlierRows = sheetToRows(outlierSheet);
  const outlierRules: OutlierRule[] = [];
  for (const row of outlierRows) {
    const variableCode = toStringOrUndefined(
      getField(row, ["variable_code", "code", "var_code"]),
    );
    if (!variableCode) continue;
    if (!knownCodes.has(variableCode)) {
      warnings.push(
        `Outlier Rules: "${variableCode}" is not defined in Variable Mapping and will be ignored.`,
      );
      continue;
    }
    const strategyRaw = toStringOrUndefined(
      getField(row, ["strategy", "outlier_strategy", "method"]),
    )?.toLowerCase() as OutlierStrategy | undefined;
    const strategy = strategyRaw && OUTLIER_STRATEGIES.includes(strategyRaw)
      ? strategyRaw
      : "keep";
    if (strategyRaw && !OUTLIER_STRATEGIES.includes(strategyRaw)) {
      warnings.push(
        `Outlier Rules: "${variableCode}" has unrecognized strategy "${strategyRaw}", defaulting to "keep".`,
      );
    }
    outlierRules.push({ variableCode, strategy });
  }

  // ---- Validation ----
  const validationSheet = findSheet(workbook, "Validation")!;
  const validationRows = sheetToRows(validationSheet);
  const validationRules: ValidationRule[] = [];
  for (const row of validationRows) {
    const variableCode = toStringOrUndefined(
      getField(row, ["variable_code", "code", "var_code"]),
    );
    if (!variableCode) continue;
    if (!knownCodes.has(variableCode)) {
      warnings.push(
        `Validation: "${variableCode}" is not defined in Variable Mapping and will be ignored.`,
      );
      continue;
    }
    const min = toNumberOrUndefined(getField(row, ["min", "minimum"]));
    const max = toNumberOrUndefined(getField(row, ["max", "maximum"]));
    const required = toBoolean(getField(row, ["required", "is_required"]), false);
    validationRules.push({ variableCode, min, max, required });
  }

  if (errors.length > 0) {
    return { config: null, errors, warnings };
  }

  const config: ParsedConfig = {
    variableMapping,
    reverseCoding,
    outlierRules,
    validationRules,
    warnings,
  };

  return { config, errors, warnings };
}
