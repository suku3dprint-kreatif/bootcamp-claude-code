import { computeColumnStats } from "@/lib/columnStats";
import { buildDataDictionary } from "@/lib/dictionary";
import { applyVariableMapping } from "@/lib/transforms/mapping";
import { applyReverseCoding } from "@/lib/transforms/reverseCode";
import { detectAndHandleOutliers } from "@/lib/transforms/outliers";
import { imputeMissingValues } from "@/lib/transforms/imputation";
import { validateData } from "@/lib/transforms/validation";
import type { ParsedConfig, ProcessingResult, RawDataset } from "@/lib/types";

export interface ProcessingMeta {
  rawFileName: string;
  configFileName: string;
}

export function runProcessing(
  dataset: RawDataset,
  config: ParsedConfig,
  meta: ProcessingMeta,
): ProcessingResult {
  const mapping = applyVariableMapping(dataset, config);
  const { headers, rows } = mapping;

  const beforeStats = computeColumnStats(rows, headers, config);

  const reverseResult = applyReverseCoding(rows, headers, config);
  const outlierResult = detectAndHandleOutliers(rows, headers, config);
  const imputationResult = imputeMissingValues(
    rows,
    headers,
    config,
    outlierResult.droppedRowIndices,
  );
  const validationIssues = validateData(rows, headers, config, outlierResult.droppedRowIndices);

  const cleanRows = rows.filter((_, i) => !outlierResult.droppedRowIndices.has(i));
  const afterStats = computeColumnStats(cleanRows, headers, config);

  const dictionary = buildDataDictionary(config, headers, afterStats, imputationResult.byVariable);

  const report: ProcessingResult["report"] = {
    generatedAt: new Date().toISOString(),
    rawFileName: meta.rawFileName,
    configFileName: meta.configFileName,
    rowCount: cleanRows.length,
    originalRowCount: rows.length,
    rowsDropped: outlierResult.droppedRowIndices.size,
    variableCount: headers.length,
    steps: {
      mapping: {
        mappedCount: mapping.mappedCount,
        unmatchedOriginalColumns: mapping.unmatchedOriginalColumns,
        unmappedRawColumns: mapping.unmappedRawColumns,
      },
      reverseCoding: {
        variablesReversed: reverseResult.variablesReversed,
        valuesChanged: reverseResult.valuesChanged,
      },
      outliers: {
        byVariable: outlierResult.byVariable,
      },
      imputation: {
        byVariable: imputationResult.byVariable,
      },
      validation: {
        issues: validationIssues,
      },
    },
    beforeStats,
    afterStats,
    changeLog: [
      ...mapping.changeLog,
      ...reverseResult.changeLog,
      ...outlierResult.changeLog,
      ...imputationResult.changeLog,
    ],
  };

  return {
    cleanHeaders: headers,
    cleanRows,
    dictionary,
    report,
  };
}
