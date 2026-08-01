# Research Data Preprocessor

A Next.js tool that turns a raw survey export plus an Excel config file into a clean CSV
ready for SmartPLS analysis, along with a data dictionary and a processing report.

## What it does

1. Upload raw survey data (`.csv` or `.xlsx`) and a config workbook (`.xlsx`).
2. Preview the parsed data and check that config columns match the raw data.
3. Run the pipeline:
   - **Column mapping** — rename verbose survey columns to short variable codes.
   - **Reverse coding** — flip configured Likert items (e.g. `1↔5` on a 1-5 scale).
   - **Outlier handling** — detect outliers via mean ± 3 SD and apply one of
     `keep`, `drop`, `cap_3sd`, `impute_mean`, `impute_median` per variable.
   - **Missing value imputation** — median for numeric variables, mode for categorical
     variables (free-text variables are left as-is).
   - **Validation** — flag values outside configured min/max ranges and missing
     required fields.
4. Download `clean_data.csv`, `data_dictionary.csv`, and `processing_report.json`.

Sample files to try this with live in [`public/sample-data/`](public/sample-data/):
`raw_survey_data.csv` and `preprocessing_config_template.xlsx` (also downloadable
from the app's upload screen). Regenerate them with `npm run sample-data`.

## Config file format

The config workbook needs exactly these 6 tabs (names must match):

| Tab | Purpose |
| --- | --- |
| `Instructions` | Free text for humans; not parsed. |
| `Variable Mapping` | `original_column`, `variable_code`, `variable_label`, `data_type` (`numeric`/`categorical`/`text`), `required` |
| `Reverse Coding` | `variable_code`, `scale_min` (default 1), `scale_max` |
| `Outlier Rules` | `variable_code`, `strategy` (`keep`/`drop`/`cap_3sd`/`impute_mean`/`impute_median`) |
| `Validation` | `variable_code`, `min`, `max`, `required` |
| `Processing Log` | Left blank; the tool's own `processing_report.json` is the actual log. |

## Architecture

- **Where processing runs**: the Upload → Preview → Process → Results wizard
  (`app/page.tsx`) parses and processes files **entirely in the browser** using
  `lib/config/parseConfig.ts`, `lib/data/parseRawData.ts`, and `lib/processor.ts`.
  Nothing is uploaded anywhere — files never leave the browser, and there's nothing
  to "auto-delete" since nothing is persisted.
- **`POST /api/process`**: the same pipeline is also exposed as a server route
  (`app/api/process/route.ts`) for programmatic/API use, accepting
  `multipart/form-data` with `rawData` and `config` file fields and returning JSON
  with the report, dictionary, and generated file contents.
  **Note:** Vercel Serverless Functions cap request bodies at ~4.5 MB, well under
  the 50 MB target in the original spec — use the in-browser wizard for larger files.
- **`lib/`** holds all the framework-independent logic (config/data parsing,
  transforms, stats, CSV/dictionary export) so it's testable without a browser or
  server, and is shared identically between the client wizard and the API route.

```
lib/
  types.ts                 shared TypeScript types
  config/parseConfig.ts    parses the 6-tab Excel config workbook
  data/parseRawData.ts     parses raw CSV/XLSX survey exports
  transforms/              mapping, reverseCode, outliers, imputation, validation
  columnStats.ts           before/after descriptive stats per variable
  dictionary.ts            builds the data dictionary
  csv.ts                   CSV export helpers
  processor.ts             orchestrates the full pipeline
components/
  ui/                      hand-written shadcn-style primitives (button, card, table, ...)
  wizard/                  the 4 wizard steps + shared bits
app/
  page.tsx                 the wizard
  api/process/route.ts     server-side pipeline endpoint
```

## Development

```bash
npm run dev     # start the dev server
npm run test    # run the pipeline test suite (Vitest)
npm run lint    # ESLint
npm run build   # production build
```

## Deployment

Deploy to Vercel as-is; `vercel.json` sets a 30s `maxDuration` for
`/api/process` (also set in the route file itself via `export const maxDuration`).
No environment variables or database are required.
