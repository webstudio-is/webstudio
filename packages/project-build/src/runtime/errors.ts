export type BuilderRuntimeErrorCode = "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT";

export class BuilderRuntimeError extends Error {
  code: BuilderRuntimeErrorCode;

  constructor(code: BuilderRuntimeErrorCode, message: string) {
    super(message);
    this.name = "BuilderRuntimeError";
    this.code = code;
  }
}

export const throwBuilderRuntimeError = (
  code: BuilderRuntimeErrorCode,
  message: string
): never => {
  throw new BuilderRuntimeError(code, message);
};
