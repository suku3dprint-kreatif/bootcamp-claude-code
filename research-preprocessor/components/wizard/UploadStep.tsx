"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropzone } from "@/components/wizard/FileDropzone";

export function UploadStep({
  rawFile,
  configFile,
  rawErrors,
  configErrors,
  onRawFileSelected,
  onConfigFileSelected,
  onContinue,
  canContinue,
}: {
  rawFile: File | null;
  configFile: File | null;
  rawErrors: string[];
  configErrors: string[];
  onRawFileSelected: (file: File) => void;
  onConfigFileSelected: (file: File) => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload your files</CardTitle>
        <CardDescription>
          Upload your raw survey export and the Excel config file that describes how to clean it.
          Nothing is uploaded to a server until you choose to process it — parsing happens right
          here in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <FileDropzone
              label="Raw survey data"
              hint="CSV or Excel (.csv, .xlsx)"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              file={rawFile}
              onFileSelected={onRawFileSelected}
            />
            {rawErrors.map((err) => (
              <Alert key={err} variant="destructive">
                <AlertDescription>{err}</AlertDescription>
              </Alert>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <FileDropzone
              label="Config file"
              hint="Excel workbook with 6 tabs (.xlsx)"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              file={configFile}
              onFileSelected={onConfigFileSelected}
            />
            {configErrors.map((err) => (
              <Alert key={err} variant="destructive">
                <AlertDescription>{err}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>

        <Alert>
          <AlertTitle>New to this tool?</AlertTitle>
          <AlertDescription>
            <p>
              Download a sample raw data file and a filled-in config template to see the expected
              format before uploading your own.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a
                className="text-sm font-medium underline underline-offset-4"
                href="/sample-data/raw_survey_data.csv"
                download
              >
                Download sample raw data (.csv)
              </a>
              <a
                className="text-sm font-medium underline underline-offset-4"
                href="/sample-data/preprocessing_config_template.xlsx"
                download
              >
                Download config template (.xlsx)
              </a>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button disabled={!canContinue} onClick={onContinue}>
            Continue to Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
