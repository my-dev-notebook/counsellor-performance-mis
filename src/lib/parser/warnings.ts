import type { Warning, WarningLevel, WarningScope } from "./schemas";

/** Builds a `Warning`, only including `sheet`/`row`/`column` when present (exactOptionalPropertyTypes). */
export function makeWarning(
  level: WarningLevel,
  scope: WarningScope,
  code: string,
  message: string,
  location?: { sheet?: string; row?: number; column?: string },
): Warning {
  return {
    level,
    scope,
    code,
    message,
    ...(location?.sheet !== undefined ? { sheet: location.sheet } : {}),
    ...(location?.row !== undefined ? { row: location.row } : {}),
    ...(location?.column !== undefined ? { column: location.column } : {}),
  };
}
