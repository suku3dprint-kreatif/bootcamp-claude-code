"use client";

import * as React from "react";

import { StepIndicator } from "@/components/wizard/StepIndicator";
import { UploadStep } from "@/components/wizard/UploadStep";
import { PreviewStep } from "@/components/wizard/PreviewStep";
import { ProcessingStep, PROCESSING_STAGES } from "@/components/wizard/ProcessingStep";
import { ResultsStep } from "@/components/wizard/ResultsStep";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseConfigWorkbook } from "@/lib/config/parseConfig";
import { parseRawData } from "@/lib/data/parseRawData";
import { runProcessing } from "@/lib/processor";
import type { ParsedConfig, ProcessingResult, RawDataset } from "@/lib/types";

const STAGE_INTERVAL_MS = 350;

export default function Home() {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  const [rawFile, setRawFile] = React.useState<File | null>(null);
  const [configFile, setConfigFile] = React.useState<File | null>(null);
  const [rawDataset, setRawDataset] = React.useState<RawDataset | null>(null);
  const [parsedConfig, setParsedConfig] = React.useState<ParsedConfig | null>(null);
  const [rawErrors, setRawErrors] = React.useState<string[]>([]);
  const [configErrors, setConfigErrors] = React.useState<string[]>([]);
  const [configWarnings, setConfigWarnings] = React.useState<string[]>([]);

  const [stageIndex, setStageIndex] = React.useState(0);
  const [progressPct, setProgressPct] = React.useState(0);
  const [result, setResult] = React.useState<ProcessingResult | null>(null);
  const [processingError, setProcessingError] = React.useState<string | null>(null);

  async function handleRawFileSelected(file: File) {
    setRawFile(file);
    setRawDataset(null);
    setRawErrors([]);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseRawData(buffer, file.name);
      setRawDataset(parsed.dataset);
      setRawErrors(parsed.errors);
    } catch {
      setRawErrors(["Unexpected error while reading this file."]);
    }
  }

  async function handleConfigFileSelected(file: File) {
    setConfigFile(file);
    setParsedConfig(null);
    setConfigErrors([]);
    setConfigWarnings([]);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseConfigWorkbook(buffer, file.name);
      setParsedConfig(parsed.config);
      setConfigErrors(parsed.errors);
      setConfigWarnings(parsed.warnings);
    } catch {
      setConfigErrors(["Unexpected error while reading this file."]);
    }
  }

  const canContinueFromUpload = Boolean(rawDataset && parsedConfig);

  React.useEffect(() => {
    // Invariant: step only becomes 3 via PreviewStep, which requires
    // rawDataset/parsedConfig/rawFile/configFile to already be non-null.
    if (step !== 3 || !rawDataset || !parsedConfig || !rawFile || !configFile) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    // Defer all state updates into a callback (rather than calling setState
    // synchronously in the effect body) so this only ever updates state in
    // response to the timer, not during the effect's own execution.
    const startTimeout = setTimeout(() => {
      if (cancelled) return;
      setStageIndex(0);
      setProgressPct(0);
      setProcessingError(null);

      let computed: ProcessingResult | null = null;
      try {
        computed = runProcessing(rawDataset, parsedConfig, {
          rawFileName: rawFile.name,
          configFileName: configFile.name,
        });
      } catch (err) {
        setProcessingError(err instanceof Error ? err.message : "Processing failed unexpectedly.");
        return;
      }

      let i = 0;
      timer = setInterval(() => {
        i += 1;
        if (cancelled) return;
        setStageIndex(i);
        setProgressPct(Math.round((i / PROCESSING_STAGES.length) * 100));
        if (i >= PROCESSING_STAGES.length) {
          clearInterval(timer);
          setResult(computed);
          setTimeout(() => {
            if (!cancelled) setStep(4);
          }, 300);
        }
      }, STAGE_INTERVAL_MS);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
      if (timer) clearInterval(timer);
    };
  }, [step, rawDataset, parsedConfig, rawFile, configFile]);

  function handleStartOver() {
    setStep(1);
    setRawFile(null);
    setConfigFile(null);
    setRawDataset(null);
    setParsedConfig(null);
    setRawErrors([]);
    setConfigErrors([]);
    setConfigWarnings([]);
    setResult(null);
    setProcessingError(null);
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Research Data Preprocessor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Clean raw survey data for SmartPLS analysis: map columns, reverse code Likert items,
            handle outliers, impute missing values, and export a ready-to-use CSV.
          </p>
        </div>

        <StepIndicator current={step} />

        {step === 1 && (
          <UploadStep
            rawFile={rawFile}
            configFile={configFile}
            rawErrors={rawErrors}
            configErrors={configErrors}
            onRawFileSelected={handleRawFileSelected}
            onConfigFileSelected={handleConfigFileSelected}
            onContinue={() => setStep(2)}
            canContinue={canContinueFromUpload}
          />
        )}

        {step === 2 && rawDataset && parsedConfig && (
          <PreviewStep
            dataset={rawDataset}
            config={parsedConfig}
            configWarnings={configWarnings}
            onBack={() => setStep(1)}
            onProcess={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <>
            <ProcessingStep stageIndex={stageIndex} progressPct={progressPct} />
            {processingError && (
              <Alert variant="destructive">
                <AlertTitle>Processing failed</AlertTitle>
                <AlertDescription>{processingError}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        {step === 4 && result && <ResultsStep result={result} onStartOver={handleStartOver} />}
      </main>
    </div>
  );
}
