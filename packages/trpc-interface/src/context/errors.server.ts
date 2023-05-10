import { customErrorFactory } from "ts-custom-error";

export const AuthorizationError = customErrorFactory(
  function AuthorizationError(message: string) {
    this.message = message;
  }
);
