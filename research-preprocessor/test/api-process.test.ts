import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/process/route";

const SAMPLE_DIR = path.join(__dirname, "..", "public", "sample-data");

function fileFrom(filePath: string, mimeType: string): File {
  const buf = fs.readFileSync(filePath);
  return new File([buf], path.basename(filePath), { type: mimeType });
}

function requestWith(form: FormData): Request {
  return new Request("http://localhost/api/process", { method: "POST", body: form });
}

const rawFile = () =>
  fileFrom(path.join(SAMPLE_DIR, "raw_survey_data.csv"), "text/csv");
const configFile = () =>
  fileFrom(
    path.join(SAMPLE_DIR, "preprocessing_config_template.xlsx"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

describe("POST /api/process", () => {
  it("processes the sample raw data + config and returns all three output files", async () => {
    const form = new FormData();
    form.set("rawData", rawFile());
    form.set("config", configFile());

    const res = await POST(requestWith(form));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.report.rowCount).toBe(80);
    expect(body.dictionary.length).toBe(18);
    expect(body.files["clean_data.csv"]).toContain("PU1");
    expect(body.files["data_dictionary.csv"]).toContain("variableCode");
    expect(JSON.parse(body.files["processing_report.json"]).rowCount).toBe(80);
  });

  it("returns 400 when the rawData field is missing", async () => {
    const form = new FormData();
    form.set("config", configFile());

    const res = await POST(requestWith(form));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors[0]).toMatch(/rawData/);
  });

  it("returns 400 when the config field is missing", async () => {
    const form = new FormData();
    form.set("rawData", rawFile());

    const res = await POST(requestWith(form));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 422 with a friendly error when the config is missing required tabs", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["a"]]), "Instructions");
    const buf = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const badConfig = new File([new Uint8Array(buf)], "broken.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const form = new FormData();
    form.set("rawData", rawFile());
    form.set("config", badConfig);

    const res = await POST(requestWith(form));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors[0]).toMatch(/missing required tab/);
  });

  it("returns 422 with a friendly error when the raw data file is empty", async () => {
    const emptyRaw = new File([""], "empty.csv", { type: "text/csv" });

    const form = new FormData();
    form.set("rawData", emptyRaw);
    form.set("config", configFile());

    const res = await POST(requestWith(form));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errors[0]).toMatch(/empty/);
  });

  it("returns 422 with a friendly error for an unsupported raw data file type", async () => {
    const badRaw = new File(["hello"], "notes.docx", { type: "application/octet-stream" });

    const form = new FormData();
    form.set("rawData", badRaw);
    form.set("config", configFile());

    const res = await POST(requestWith(form));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.errors[0]).toMatch(/Unsupported file type/);
  });
});
