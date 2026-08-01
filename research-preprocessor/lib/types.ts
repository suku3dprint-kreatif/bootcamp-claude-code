export type DataType = "numeric" | "categorical" | "text";

export type OutlierStrategy =
  | "keep"
  | "drop"
  | "cap_3sd"
  | "impute_mean"
  | "impute_median";

export interface VariableMappingRule {
  originalColumn: string;
  variableCode: string;
  variableLabel: string;
  dataType: DataType;
  required: boolean;
}

export interface ReverseCodingRule {
  variableCode: string;
  scaleMin: number;
  scaleMax: number;
}

export interface OutlierRule {
  variableCode: string;
  strategy: OutlierStrategy;
}

export interface ValidationRule {
  variableCode: string;
  min?: number;
  max?: number;
  required: boolean;
}

export interface ParsedConfig {
  variableMapping: VariableMappingRule[];
  reverseCoding: ReverseCodingRule[];
  outlierRules: OutlierRule[];
  validationRules: ValidationRule[];
  warnings: string[];
}

export interface ConfigParseResult {
  config: ParsedConfig | null;
  errors: string[];
  warnings: string[];
}

export interface RawDataset {
  headers: string[];
  rows: Record<string, unknown>[];
  sourceFileName: string;
}

export interface DataParseResult {
  dataset: RawDataset | null;
  errors: string[];
}

export interface ColumnStats {
  variableCode: string;
  originalColumn: string;
  dataType: DataType;
  count: number;
  missing: number;
  mean?: number;
  median?: number;
  sd?: number;
  min?: number;
  max?: number;
  mode?: string | number;
}

export type ProcessingStep =
  | "mapping"
  | "reverse_coding"
  | "outliers"
  | "imputation"
  | "validation";

export interface ChangeLogEntry {
  step: ProcessingStep;
  variableCode: string;
  rowIndex?: number;
  action: string;
  before?: unknown;
  after?: unknown;
}

export interface ValidationIssue {
  variableCode: string;
  rowIndex: number;
  message: string;
  severity: "error" | "warning";
}

export interface ProcessingReport {
  generatedAt: string;
  rawFileName: string;
  configFileName: string;
  rowCount: number;
  originalRowCount: number;
  rowsDropped: number;
  variableCount: number;
  steps: {
    mapping: {
      mappedCount: number;
      unmatchedOriginalColumns: string[];
      unmappedRawColumns: string[];
    };
    reverseCoding: {
      variablesReversed: string[];
      valuesChanged: number;
    };
    outliers: {
      byVariable: Record<
        string,
        { strategy: OutlierStrategy; detected: number; handled: number }
      >;
    };
    imputation: {
      byVariable: Record<
        string,
        { method: "mean" | "median" | "mode"; imputedCount: number }
      >;
    };
    validation: {
      issues: ValidationIssue[];
    };
  };
  beforeStats: ColumnStats[];
  afterStats: ColumnStats[];
  changeLog: ChangeLogEntry[];
}

export interface DataDictionaryRow {
  variableCode: string;
  originalColumn: string;
  label: string;
  dataType: DataType;
  reverseCoded: boolean;
  outlierStrategy: OutlierStrategy | null;
  min?: number;
  max?: number;
  required: boolean;
  missingCount: number;
  imputedCount: number;
}

export interface ProcessingResult {
  cleanHeaders: string[];
  cleanRows: Record<string, unknown>[];
  dictionary: DataDictionaryRow[];
  report: ProcessingReport;
}
