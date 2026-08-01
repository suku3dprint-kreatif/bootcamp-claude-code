import type { ChangeLogEntry, ParsedConfig } from "@/lib/types";
import { toNumber } from "@/lib/transforms/stats";

const MAX_LOGGED_PER_VARIABLE = 10;

export interface ReverseCodingResult {
  variablesReversed: string[];
  valuesChanged: number;
  changeLog: ChangeLogEntry[];
}

export function applyReverseCoding(
  rows: Record<string, unknown>[],
  headers: string[],
  config: ParsedConfig,
): ReverseCodingResult {
  const headerSet = new Set(headers);
  const variablesReversed: string[] = [];
  const changeLog: ChangeLogEntry[] = [];
  let valuesChanged = 0;

  for (const rule of config.reverseCoding) {
    if (!headerSet.has(rule.variableCode)) continue;
    let changedForVariable = 0;
    let loggedForVariable = 0;

    for (const row of rows) {
      const original = row[rule.variableCode];
      const num = toNumber(original);
      if (num === null) continue;
      const reversed = rule.scaleMin + rule.scaleMax - num;
      row[rule.variableCode] = reversed;
      changedForVariable += 1;
      if (loggedForVariable < MAX_LOGGED_PER_VARIABLE) {
        changeLog.push({
          step: "reverse_coding",
          variableCode: rule.variableCode,
          action: `Reverse coded (scale ${rule.scaleMin}-${rule.scaleMax}): ${num} -> ${reversed}.`,
          before: num,
          after: reversed,
        });
        loggedForVariable += 1;
      }
    }

    if (changedForVariable > 0) {
      variablesReversed.push(rule.variableCode);
      valuesChanged += changedForVariable;
    }
  }

  return { variablesReversed, valuesChanged, changeLog };
}
