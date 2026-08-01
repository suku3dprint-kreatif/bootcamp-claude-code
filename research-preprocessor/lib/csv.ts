import Papa from "papaparse";
import type { DataDictionaryRow } from "@/lib/types";

export function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  return Papa.unparse({
    fields: headers,
    data: rows.map((row) => headers.map((h) => row[h] ?? "")),
  });
}

export function dictionaryToCsv(dictionary: DataDictionaryRow[]): string {
  const fields: (keyof DataDictionaryRow)[] = [
    "variableCode",
    "originalColumn",
    "label",
    "dataType",
    "reverseCoded",
    "outlierStrategy",
    "min",
    "max",
    "required",
    "missingCount",
    "imputedCount",
  ];
  return Papa.unparse({
    fields: fields as string[],
    data: dictionary.map((row) => fields.map((f) => row[f] ?? "")),
  });
}
