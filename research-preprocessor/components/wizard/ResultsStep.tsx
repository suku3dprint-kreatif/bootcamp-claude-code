"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dictionaryToCsv, rowsToCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import type { ProcessingResult } from "@/lib/types";

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MissingBar({ label, before, after, max }: { label: string; before: number; after: number; max: number }) {
  const beforePct = max > 0 ? (before / max) * 100 : 0;
  const afterPct = max > 0 ? (after / max) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {before} → {after} missing
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-amber-400" style={{ width: `${beforePct}%` }} />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-emerald-500" style={{ width: `${afterPct}%` }} />
      </div>
    </div>
  );
}

export function ResultsStep({
  result,
  onStartOver,
}: {
  result: ProcessingResult;
  onStartOver: () => void;
}) {
  const { report, dictionary, cleanHeaders, cleanRows } = result;

  const outliersHandled = Object.values(report.steps.outliers.byVariable).reduce(
    (sum, v) => sum + v.handled,
    0,
  );
  const imputedTotal = Object.values(report.steps.imputation.byVariable).reduce(
    (sum, v) => sum + v.imputedCount,
    0,
  );
  const errorCount = report.steps.validation.issues.filter((i) => i.severity === "error").length;
  const warningCount = report.steps.validation.issues.filter((i) => i.severity === "warning").length;

  const numericStats = report.afterStats.filter((s) => s.dataType === "numeric");
  const beforeByCode = new Map(report.beforeStats.map((s) => [s.variableCode, s]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
        <CardDescription>
          Processed {report.originalRowCount} rows into {report.rowCount} clean rows across{" "}
          {report.variableCount} variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Clean rows" value={report.rowCount} />
          <SummaryCard label="Rows dropped" value={report.rowsDropped} />
          <SummaryCard label="Values imputed" value={imputedTotal} />
          <SummaryCard label="Outliers handled" value={outliersHandled} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={errorCount > 0 ? "destructive" : "success"}>
            {errorCount} validation error{errorCount === 1 ? "" : "s"}
          </Badge>
          <Badge variant={warningCount > 0 ? "secondary" : "success"}>
            {warningCount} validation warning{warningCount === 1 ? "" : "s"}
          </Badge>
          <Badge variant="secondary">
            {report.steps.reverseCoding.variablesReversed.length} variable(s) reverse coded
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              downloadTextFile(
                "clean_data.csv",
                rowsToCsv(cleanHeaders, cleanRows),
                "text/csv;charset=utf-8",
              )
            }
          >
            Download clean_data.csv
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadTextFile(
                "data_dictionary.csv",
                dictionaryToCsv(dictionary),
                "text/csv;charset=utf-8",
              )
            }
          >
            Download data_dictionary.csv
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadTextFile(
                "processing_report.json",
                JSON.stringify(report, null, 2),
                "application/json",
              )
            }
          >
            Download processing_report.json
          </Button>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Missing values: before vs. after</h4>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            {report.afterStats.map((after) => {
              const before = beforeByCode.get(after.variableCode);
              if (!before || (before.missing === 0 && after.missing === 0)) return null;
              return (
                <MissingBar
                  key={after.variableCode}
                  label={after.variableCode}
                  before={before.missing}
                  after={after.missing}
                  max={report.originalRowCount}
                />
              );
            })}
            {report.afterStats.every((s) => s.missing === 0 && (beforeByCode.get(s.variableCode)?.missing ?? 0) === 0) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No missing values were found in this dataset.
              </p>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Numeric variables: before vs. after</h4>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable</TableHead>
                  <TableHead>Mean (before → after)</TableHead>
                  <TableHead>SD (before → after)</TableHead>
                  <TableHead>Min / Max (after)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numericStats.map((after) => {
                  const before = beforeByCode.get(after.variableCode);
                  return (
                    <TableRow key={after.variableCode}>
                      <TableCell className="font-medium">{after.variableCode}</TableCell>
                      <TableCell>
                        {before?.mean ?? "—"} → {after.mean ?? "—"}
                      </TableCell>
                      <TableCell>
                        {before?.sd ?? "—"} → {after.sd ?? "—"}
                      </TableCell>
                      <TableCell>
                        {after.min ?? "—"} / {after.max ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Data dictionary</h4>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reverse</TableHead>
                  <TableHead>Outlier strategy</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Imputed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dictionary.map((row) => (
                  <TableRow key={row.variableCode}>
                    <TableCell className="font-medium">{row.variableCode}</TableCell>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{row.dataType}</TableCell>
                    <TableCell>{row.reverseCoded ? "Yes" : "—"}</TableCell>
                    <TableCell>{row.outlierStrategy ?? "—"}</TableCell>
                    <TableCell>
                      {row.min ?? "—"} / {row.max ?? "—"}
                    </TableCell>
                    <TableCell>{row.imputedCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {report.steps.validation.issues.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium">Validation issues (first 20)</h4>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Variable</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.steps.validation.issues.slice(0, 20).map((issue, i) => (
                    <TableRow key={i}>
                      <TableCell>{issue.rowIndex + 1}</TableCell>
                      <TableCell>{issue.variableCode}</TableCell>
                      <TableCell>
                        <Badge variant={issue.severity === "error" ? "destructive" : "secondary"}>
                          {issue.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">{issue.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
