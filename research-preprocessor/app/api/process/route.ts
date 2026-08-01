import { NextResponse } from "next/server";

import { parseConfigWorkbook } from "@/lib/config/parseConfig";
import { parseRawData } from "@/lib/data/parseRawData";
import { dictionaryToCsv, rowsToCsv } from "@/lib/csv";
import { runProcessing } from "@/lib/processor";

// Vercel Serverless Functions cap the request body at ~4.5 MB, well under the
// 50MB target in the spec. This endpoint exists for programmatic/API access
// and small files; the app's own Upload -> Results wizard processes files
// entirely in the browser (see app/page.tsx) so it isn't bound by this limit.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, errors: ["Request body could not be read as form data."] },
      { status: 400 },
    );
  }

  const rawFile = formData.get("rawData");
  const configFile = formData.get("config");

  if (!(rawFile instanceof File) || !(configFile instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          'Both a "rawData" file and a "config" file must be included in the multipart form data.',
        ],
      },
      { status: 400 },
    );
  }

  const [rawBuffer, configBuffer] = await Promise.all([
    rawFile.arrayBuffer(),
    configFile.arrayBuffer(),
  ]);

  const configResult = parseConfigWorkbook(configBuffer, configFile.name);
  if (!configResult.config) {
    return NextResponse.json(
      { success: false, errors: configResult.errors, warnings: configResult.warnings },
      { status: 422 },
    );
  }

  const dataResult = parseRawData(rawBuffer, rawFile.name);
  if (!dataResult.dataset) {
    return NextResponse.json(
      { success: false, errors: dataResult.errors },
      { status: 422 },
    );
  }

  const result = runProcessing(dataResult.dataset, configResult.config, {
    rawFileName: rawFile.name,
    configFileName: configFile.name,
  });

  return NextResponse.json({
    success: true,
    warnings: [...configResult.warnings, ...dataResult.errors],
    report: result.report,
    dictionary: result.dictionary,
    files: {
      "clean_data.csv": rowsToCsv(result.cleanHeaders, result.cleanRows),
      "data_dictionary.csv": dictionaryToCsv(result.dictionary),
      "processing_report.json": JSON.stringify(result.report, null, 2),
    },
  });
}
