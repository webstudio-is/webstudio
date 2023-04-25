import type { JsonObject } from "type-fest";

export type Template = {
  prompt: string;
  temperature: number;
  maxTokens?: number;
  getCode: (response: string) => string;
  transform: <T>(src: string) => T;
  validate: (json: JsonObject) => void;
};

export { templateJsx } from "./jsx";
