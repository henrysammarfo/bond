/**
 * Runtime error capture for production (no third-party editor hooks).
 */
export function reportRuntimeError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error("[bond-runtime]", message, context, stack ?? "");
}
