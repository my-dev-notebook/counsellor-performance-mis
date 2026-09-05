import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { z } from "zod";

/** `SafeParseReturnType` → `Result`, so zod's boundary validation composes with neverthrow. */
export function fromZod<T>(parsed: z.ZodSafeParseResult<T>): Result<T, z.ZodError<T>> {
  return parsed.success ? ok(parsed.data) : err(parsed.error);
}

/** Partitions a list of `Result`s so one bad item never sinks the rest (PLAN.md §8.2). */
export function collectResults<T, E>(results: readonly Result<T, E>[]): { ok: T[]; err: E[] } {
  const oks: T[] = [];
  const errs: E[] = [];
  for (const result of results) {
    result.match(
      (value) => oks.push(value),
      (error) => errs.push(error),
    );
  }
  return { ok: oks, err: errs };
}
