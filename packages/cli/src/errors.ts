export class HandledCliError extends Error {
  constructor() {
    super("Handled CLI error");
    this.name = "HandledCliError";
  }
}

export const isHandledCliError = (error: unknown) =>
  error instanceof HandledCliError;
