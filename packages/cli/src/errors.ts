export class CliError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "CliError";
  }
}

export class HandledCliError extends Error {
  constructor() {
    super("Handled CLI error");
    this.name = "HandledCliError";
  }
}

export const isHandledCliError = (error: unknown) =>
  error instanceof HandledCliError;
