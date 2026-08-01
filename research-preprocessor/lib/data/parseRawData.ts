import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { DataParseResult } from "@/lib/types";

function detectFormat(fileName: string): "csv" | "excel" | "unknown" {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "tsv" || ext === "txt") return "csv";
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") return "excel";
  return "unknown";
}

function bufferToText(data: ArrayBuffer): string {
  let bytes = new Uint8Array(data);
  // Strip UTF-8 BOM if present so header names don't get a stray char.
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    bytes = bytes.subarray(3);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function parseCsv(data: ArrayBuffer, fileName: string): DataParseResult {
  const text = bufferToText(data);
  // dynamicTyping is intentionally left off: Papaparse auto-parses
  // ISO-date-looking strings into Date objects (not just numbers), which
  // would silently mangle date-like survey columns. Numeric coercion is
  // instead handled explicitly by toNumber() throughout the pipeline.
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  const errors: string[] = [];
  if (result.errors.length > 0) {
    const fatal = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatal.length > 0 && result.data.length === 0) {
      return {
        dataset: null,
        errors: [
          `Could not parse "${fileName}" as CSV: ${fatal[0].message}. Check that the file is comma-separated and uses UTF-8 encoding.`,
        ],
      };
    }
  }

  const headers = (result.meta.fields ?? []).map((h) => h.trim());
  if (headers.length === 0 || result.data.length === 0) {
    return {
      dataset: null,
      errors: [`"${fileName}" appears to be empty or has no detectable header row.`],
    };
  }

  return {
    dataset: { headers, rows: result.data, sourceFileName: fileName },
    errors,
  };
}

function parseExcel(data: ArrayBuffer, fileName: string): DataParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(data), { type: "array" });
  } catch {
    return {
      dataset: null,
      errors: [`Could not read "${fileName}" as an Excel file.`],
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { dataset: null, errors: [`"${fileName}" has no sheets.`] };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  if (rows.length === 0) {
    return {
      dataset: null,
      errors: [`"${fileName}" (sheet "${sheetName}") has no data rows.`],
    };
  }

  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) headerSet.add(key.trim());
  }

  return {
    dataset: { headers: Array.from(headerSet), rows, sourceFileName: fileName },
    errors: [],
  };
}

export function parseRawData(data: ArrayBuffer, fileName: string): DataParseResult {
  const format = detectFormat(fileName);
  if (format === "csv") return parseCsv(data, fileName);
  if (format === "excel") return parseExcel(data, fileName);
  return {
    dataset: null,
    errors: [
      `Unsupported file type for "${fileName}". Please upload a .csv or .xlsx file.`,
    ],
  };
}
