"use client";

import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyVariableMapping } from "@/lib/transforms/mapping";
import type { ParsedConfig, RawDataset } from "@/lib/types";

const PREVIEW_ROWS = 6;
const PREVIEW_COLS = 6;

export function PreviewStep({
  dataset,
  config,
  configWarnings,
  onBack,
  onProcess,
}: {
  dataset: RawDataset;
  config: ParsedConfig;
  configWarnings: string[];
  onBack: () => void;
  onProcess: () => void;
}) {
  const mapping = React.useMemo(() => applyVariableMapping(dataset, config), [dataset, config]);
  const previewHeaders = dataset.headers.slice(0, PREVIEW_COLS);
  const previewRows = dataset.rows.slice(0, PREVIEW_ROWS);

  const hasBlockingIssue = mapping.mappedCount === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview &amp; validation</CardTitle>
        <CardDescription>
          Check that your column mapping lines up with the raw data before running the full
          pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Rows detected" value={dataset.rows.length} />
          <SummaryStat label="Raw columns" value={dataset.headers.length} />
          <SummaryStat label="Variables mapped" value={mapping.mappedCount} />
          <SummaryStat
            label="Unmatched columns"
            value={mapping.unmatchedOriginalColumns.length}
            tone={mapping.unmatchedOriginalColumns.length > 0 ? "warning" : "default"}
          />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Raw data preview</h4>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                  {dataset.headers.length > PREVIEW_COLS && <TableHead>…</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, i) => (
                  <TableRow key={i}>
                    {previewHeaders.map((h) => (
                      <TableCell key={h}>{String(row[h] ?? "")}</TableCell>
                    ))}
                    {dataset.headers.length > PREVIEW_COLS && <TableCell>…</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {dataset.rows.length > PREVIEW_ROWS && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Showing {PREVIEW_ROWS} of {dataset.rows.length} rows and {previewHeaders.length} of{" "}
              {dataset.headers.length} columns.
            </p>
          )}
        </div>

        {mapping.unmatchedOriginalColumns.length > 0 && (
          <Alert variant="warning">
            <AlertTitle>Some config columns weren&apos;t found in the raw data</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc">
                {mapping.unmatchedOriginalColumns.map((col) => (
                  <li key={col}>&quot;{col}&quot; — check for typos or extra spaces.</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {mapping.unmappedRawColumns.length > 0 && (
          <Alert>
            <AlertTitle>Raw columns not used by the config</AlertTitle>
            <AlertDescription>
              <p className="mb-1">
                These will be dropped from the output (not necessarily a problem):
              </p>
              <div className="flex flex-wrap gap-1">
                {mapping.unmappedRawColumns.map((col) => (
                  <Badge key={col} variant="secondary">
                    {col}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {configWarnings.length > 0 && (
          <Alert variant="warning">
            <AlertTitle>Config warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc">
                {configWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {hasBlockingIssue && (
          <Alert variant="destructive">
            <AlertTitle>No columns could be mapped</AlertTitle>
            <AlertDescription>
              None of the config&apos;s original_column values matched the raw data headers.
              Fix the config file and re-upload before continuing.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button disabled={hasBlockingIssue} onClick={onProcess}>
            Start Processing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`text-xl font-semibold ${tone === "warning" && value > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
