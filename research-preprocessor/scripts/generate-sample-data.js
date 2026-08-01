/*
 * Generates public/sample-data/raw_survey_data.csv and
 * public/sample-data/preprocessing_config_template.xlsx used both by the
 * "Download sample files" link in the UI and by the automated tests.
 * Run with: node scripts/generate-sample-data.js
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Deterministic PRNG (mulberry32) so re-running this script produces the
// same sample data every time.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function likert(skewHigh = true) {
  // Roughly bell-shaped around 4 (skewHigh) or 2 (skewLow), values 1-5.
  const weightsHigh = [0.04, 0.08, 0.18, 0.38, 0.32];
  const weightsLow = [0.32, 0.38, 0.18, 0.08, 0.04];
  const weights = skewHigh ? weightsHigh : weightsLow;
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return i + 1;
  }
  return 5;
}

function maybeMissing(value, chance) {
  return rand() < chance ? "" : value;
}

const N_RESPONDENTS = 80;

const RAW_HEADERS = [
  "Timestamp",
  "Jenis Kelamin",
  "Usia (tahun)",
  "Lama menggunakan aplikasi (bulan)",
  "PU1 - Sistem ini bermanfaat untuk pekerjaan saya",
  "PU2 - Sistem ini mempercepat penyelesaian pekerjaan saya",
  "PU3 - Sistem ini meningkatkan produktivitas saya",
  "PU4 - Secara keseluruhan sistem ini berguna bagi saya",
  "EOU1 - Sistem ini mudah dipelajari",
  "EOU2 - Interaksi dengan sistem ini jelas dan mudah dipahami",
  "EOU3 - Sistem ini sulit digunakan",
  "EOU4 - Saya merasa terampil menggunakan sistem ini",
  "ATT1 - Saya menyukai penggunaan sistem ini",
  "ATT2 - Menggunakan sistem ini adalah ide yang baik",
  "ATT3 - Saya memiliki sikap positif terhadap sistem ini",
  "BI1 - Saya berniat terus menggunakan sistem ini ke depannya",
  "BI2 - Saya akan merekomendasikan sistem ini ke orang lain",
  "BI3 - Saya berencana menggunakan sistem ini secara rutin",
  "Saran/masukan (opsional)",
];

const feedbackOptions = [
  "",
  "",
  "",
  "Tampilan bisa lebih sederhana.",
  "Sudah cukup baik, terima kasih.",
  "Kadang loading agak lama.",
  "Fitur pencarian perlu ditingkatkan.",
];

function makeRow(index) {
  const outlierAgeRow = index === 12 || index === 47;
  const outlierTenureRow = index === 30;
  const missingAgeRow = index === 5 || index === 60;

  let age;
  if (outlierAgeRow) age = pick([130, 4]);
  else if (missingAgeRow) age = "";
  else age = Math.round(28 + (rand() - 0.5) * 14);

  let tenure;
  if (outlierTenureRow) tenure = 540;
  else tenure = maybeMissing(Math.max(1, Math.round(18 + (rand() - 0.5) * 22)), 0.05);

  const row = [
    `2026-0${(index % 6) + 1}-1${(index % 8)}T09:${10 + (index % 40)}:00Z`,
    maybeMissing(pick(["Laki-laki", "Perempuan"]), 0.03),
    age,
    tenure,
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    // EOU3 is reverse-worded ("hard to use"); respondents of a good system
    // disagree, so raw answers skew low here before reverse coding.
    maybeMissing(likert(false), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    maybeMissing(likert(true), 0.04),
    pick(feedbackOptions),
  ];
  return row;
}

function toCsvValue(value) {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const rows = Array.from({ length: N_RESPONDENTS }, (_, i) => makeRow(i));
const csvLines = [
  RAW_HEADERS.map(toCsvValue).join(","),
  ...rows.map((row) => row.map(toCsvValue).join(",")),
];
const csvContent = csvLines.join("\n") + "\n";

const outDir = path.join(__dirname, "..", "public", "sample-data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "raw_survey_data.csv"), csvContent, "utf-8");

// ---- Config workbook ----

const instructionsRows = [
  ["Research Data Preprocessing Tool - Config Template"],
  [""],
  ["How to use this file:"],
  ["1. Variable Mapping: map each raw column name to a short variable code used in SmartPLS."],
  ["2. Reverse Coding: list any Likert items that need reverse scoring, with the scale min/max."],
  ["3. Outlier Rules: choose a strategy per numeric variable (keep, drop, cap_3sd, impute_mean, impute_median)."],
  ["4. Validation: set min/max ranges and which variables are required."],
  ["5. Processing Log: left blank here; the tool fills its own processing_report.json after running."],
  [""],
  ["Do not rename the 6 tab names below - the tool looks them up by name."],
];

const variableMapping = [
  ["original_column", "variable_code", "variable_label", "data_type", "required"],
  ["Jenis Kelamin", "GENDER", "Gender", "categorical", "yes"],
  ["Usia (tahun)", "AGE", "Age (years)", "numeric", "yes"],
  ["Lama menggunakan aplikasi (bulan)", "TENURE_MONTHS", "Tenure (months)", "numeric", "no"],
  ["PU1 - Sistem ini bermanfaat untuk pekerjaan saya", "PU1", "Perceived Usefulness 1", "numeric", "yes"],
  ["PU2 - Sistem ini mempercepat penyelesaian pekerjaan saya", "PU2", "Perceived Usefulness 2", "numeric", "yes"],
  ["PU3 - Sistem ini meningkatkan produktivitas saya", "PU3", "Perceived Usefulness 3", "numeric", "yes"],
  ["PU4 - Secara keseluruhan sistem ini berguna bagi saya", "PU4", "Perceived Usefulness 4", "numeric", "yes"],
  ["EOU1 - Sistem ini mudah dipelajari", "EOU1", "Perceived Ease of Use 1", "numeric", "yes"],
  ["EOU2 - Interaksi dengan sistem ini jelas dan mudah dipahami", "EOU2", "Perceived Ease of Use 2", "numeric", "yes"],
  ["EOU3 - Sistem ini sulit digunakan", "EOU3", "Perceived Ease of Use 3 (reverse worded)", "numeric", "yes"],
  ["EOU4 - Saya merasa terampil menggunakan sistem ini", "EOU4", "Perceived Ease of Use 4", "numeric", "yes"],
  ["ATT1 - Saya menyukai penggunaan sistem ini", "ATT1", "Attitude 1", "numeric", "yes"],
  ["ATT2 - Menggunakan sistem ini adalah ide yang baik", "ATT2", "Attitude 2", "numeric", "yes"],
  ["ATT3 - Saya memiliki sikap positif terhadap sistem ini", "ATT3", "Attitude 3", "numeric", "yes"],
  ["BI1 - Saya berniat terus menggunakan sistem ini ke depannya", "BI1", "Behavioral Intention 1", "numeric", "yes"],
  ["BI2 - Saya akan merekomendasikan sistem ini ke orang lain", "BI2", "Behavioral Intention 2", "numeric", "yes"],
  ["BI3 - Saya berencana menggunakan sistem ini secara rutin", "BI3", "Behavioral Intention 3", "numeric", "yes"],
  ["Saran/masukan (opsional)", "FEEDBACK_TEXT", "Open feedback", "text", "no"],
];

const reverseCoding = [
  ["variable_code", "scale_min", "scale_max"],
  ["EOU3", 1, 5],
];

const outlierRules = [
  ["variable_code", "strategy"],
  ["AGE", "cap_3sd"],
  ["TENURE_MONTHS", "impute_median"],
  ["BI1", "keep"],
];

const validation = [
  ["variable_code", "min", "max", "required"],
  ["AGE", 17, 70, "yes"],
  ["TENURE_MONTHS", 0, 240, "no"],
  ["PU1", 1, 5, "yes"],
  ["PU2", 1, 5, "yes"],
  ["PU3", 1, 5, "yes"],
  ["PU4", 1, 5, "yes"],
  ["EOU1", 1, 5, "yes"],
  ["EOU2", 1, 5, "yes"],
  ["EOU3", 1, 5, "yes"],
  ["EOU4", 1, 5, "yes"],
  ["ATT1", 1, 5, "yes"],
  ["ATT2", 1, 5, "yes"],
  ["ATT3", 1, 5, "yes"],
  ["BI1", 1, 5, "yes"],
  ["BI2", 1, 5, "yes"],
  ["BI3", 1, 5, "yes"],
];

const processingLog = [
  ["timestamp", "step", "variable", "action", "count"],
  ["(filled in automatically by the tool - see processing_report.json after running)"],
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructionsRows), "Instructions");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(variableMapping), "Variable Mapping");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(reverseCoding), "Reverse Coding");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(outlierRules), "Outlier Rules");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(validation), "Validation");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(processingLog), "Processing Log");

XLSX.writeFile(workbook, path.join(outDir, "preprocessing_config_template.xlsx"));

console.log(`Wrote ${N_RESPONDENTS} rows to ${path.join(outDir, "raw_survey_data.csv")}`);
console.log(`Wrote config template to ${path.join(outDir, "preprocessing_config_template.xlsx")}`);
