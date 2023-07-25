/**
 * Throws a provided error in development and makes sure error is captured in production by Sentry or any other tool we might decide to use.
 * If you pass `value` and value is not `never` it will give you a nice compile time error to statically check for branches that should never be entered.
 * Example: `if (value === "foo") { return "foo"; } else { return captureError(new Error("Should never happen"), value); }`
 */
export const captureError = <Value = undefined>(
  error: unknown,
  value: Value
) => {
  if (process.env.NODE_ENV === "development") {
    throw error;
  }
  // Let error logger catch it in production, so we don't break the UI
  setTimeout(() => {
    throw error;
  });
  return value;
};
