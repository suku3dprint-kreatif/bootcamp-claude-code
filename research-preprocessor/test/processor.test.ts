import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseConfigWorkbook, REQUIRED_TABS } from "@/lib/config/parseConfig";
import { parseRawData } from "@/lib/data/parseRawData";
import { runProcessing } from "@/lib/processor";
import { isMissing, toNumber } from "@/lib/transforms/stats";

const SAMPLE_DIR = path.join(__dirname, "..", "public", "sample-data");

function readFileAsArrayBuffer(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe("parseConfigWorkbook", () => {
  it("parses the generated sample config template without errors", () => {
    const buffer = readFileAsArrayBuffer(
      path.join(SAMPLE_DIR, "preprocessing_config_template.xlsx"),
    );
    const result = parseConfigWorkbook(buffer, "preprocessing_config_template.xlsx");
    expect(result.errors).toEqual([]);
    expect(result.config).not.toBeNull();
    expect(result.config!.variableMapping.length).toBe(18);
    expect(result.config!.reverseCoding).toEqual([{ variableCode: "EOU3", scaleMin: 1, scaleMax: 5 }]);
    expect(result.config!.outlierRules.map((r) => r.variableCode).sort()).toEqual([
      "AGE",
      "BI1",
      "TENURE_MONTHS",
    ]);
  });

  it("reports a fatal error when a required tab is missing", () => {
    const workbook = XLSX.utils.book_new();
    for (const tab of REQUIRED_TABS) {
      if (tab === "Processing Log") continue; // omit one tab on purpose
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["a"]]), tab);
    }
    const buf = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const result = parseConfigWorkbook(buf, "broken.xlsx");
    expect(result.config).toBeNull();
    expect(result.errors[0]).toMatch(/Processing Log/);
  });

  it("rejects duplicate variable codes", () => {
    const workbook = XLSX.utils.book_new();
    for (const tab of REQUIRED_TABS) {
      if (tab === "Variable Mapping") continue;
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["placeholder"]]), tab);
    }
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["original_column", "variable_code", "variable_label", "data_type", "required"],
        ["Col A", "X1", "Label A", "numeric", "yes"],
        ["Col B", "X1", "Label B", "numeric", "yes"],
      ]),
      "Variable Mapping",
    );
    const buf = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const result = parseConfigWorkbook(buf, "dup.xlsx");
    expect(result.config).toBeNull();
    expect(result.errors.some((e) => e.includes("duplicate variable_code"))).toBe(true);
  });
});

describe("parseRawData", () => {
  it("parses the generated sample CSV", () => {
    const buffer = readFileAsArrayBuffer(path.join(SAMPLE_DIR, "raw_survey_data.csv"));
    const result = parseRawData(buffer, "raw_survey_data.csv");
    expect(result.dataset).not.toBeNull();
    expect(result.dataset!.rows.length).toBe(80);
    expect(result.dataset!.headers).toContain("Timestamp");
    expect(result.dataset!.headers).toContain("PU1 - Sistem ini bermanfaat untuk pekerjaan saya");
  });
});

describe("runProcessing (end-to-end pipeline)", () => {
  const configBuffer = readFileAsArrayBuffer(
    path.join(SAMPLE_DIR, "preprocessing_config_template.xlsx"),
  );
  const { config } = parseConfigWorkbook(configBuffer, "preprocessing_config_template.xlsx");
  const dataBuffer = readFileAsArrayBuffer(path.join(SAMPLE_DIR, "raw_survey_data.csv"));
  const { dataset } = parseRawData(dataBuffer, "raw_survey_data.csv");

  if (!config || !dataset) throw new Error("fixture setup failed");

  const result = runProcessing(dataset, config, {
    rawFileName: "raw_survey_data.csv",
    configFileName: "preprocessing_config_template.xlsx",
  });

  it("maps columns and drops the unmapped Timestamp column", () => {
    expect(result.cleanHeaders).not.toContain("Timestamp");
    expect(result.cleanHeaders).toContain("PU1");
    expect(result.cleanHeaders).toContain("FEEDBACK_TEXT");
    expect(result.report.steps.mapping.unmappedRawColumns).toEqual(["Timestamp"]);
    expect(result.report.steps.mapping.unmatchedOriginalColumns).toEqual([]);
  });

  it("keeps all rows since no variable uses the drop strategy", () => {
    expect(result.report.rowsDropped).toBe(0);
    expect(result.cleanRows.length).toBe(80);
  });

  it("caps AGE outliers to within 3 SD instead of leaving raw extreme values", () => {
    const ages = result.cleanRows.map((r) => toNumber(r.AGE)).filter((v): v is number => v !== null);
    expect(ages).not.toContain(130);
    expect(ages).not.toContain(4);
    expect(result.report.steps.outliers.byVariable.AGE.detected).toBeGreaterThan(0);
    expect(result.report.steps.outliers.byVariable.AGE.strategy).toBe("cap_3sd");
  });

  it("reverse codes EOU3 so it correlates with the other EOU items", () => {
    expect(result.report.steps.reverseCoding.variablesReversed).toContain("EOU3");
    expect(result.report.steps.reverseCoding.valuesChanged).toBeGreaterThan(0);
  });

  it("imputes every remaining missing numeric/categorical value", () => {
    for (const row of result.cleanRows) {
      for (const code of result.cleanHeaders) {
        if (code === "FEEDBACK_TEXT") continue; // text is intentionally never imputed
        expect(isMissing(row[code])).toBe(false);
      }
    }
    expect(Object.keys(result.report.steps.imputation.byVariable).length).toBeGreaterThan(0);
  });

  it("produces no required-field validation errors after imputation", () => {
    const errors = result.report.steps.validation.issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("builds a data dictionary row per mapped variable", () => {
    expect(result.dictionary.length).toBe(18);
    const eou3 = result.dictionary.find((d) => d.variableCode === "EOU3");
    expect(eou3?.reverseCoded).toBe(true);
    const age = result.dictionary.find((d) => d.variableCode === "AGE");
    expect(age?.outlierStrategy).toBe("cap_3sd");
  });
});
