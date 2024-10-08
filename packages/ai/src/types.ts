import { type RemixStreamingTextResponse } from "./utils/remix-streaming-text-response";

/**
 * Generic Response types used both by Models and Chains.
 */

// @todo Convert the response types to Zod
// so that responses can be parsed and validated on the client.

export type Tokens = {
  prompt: number;
  completion: number;
};

export type SuccessResponse<ResponseData> = {
  type: ResponseData extends RemixStreamingTextResponse ? "stream" : "json";
  success: true;
  tokens: Tokens;
  data: ResponseData;
};

export type ErrorResponse = {
  type: "json";
  success: false;
  tokens: Tokens;
  data: {
    status: number;
    error: string;
    message: string;
    debug?: string;
  };
};

type Response<ResponseData> = {
  id: string;
} & (SuccessResponse<ResponseData> | ErrorResponse);

/**
 * Models types.
 *
 * Types for a generic vendor-agnostic LLM client.
 * Each vendor (eg. OpenAI) implementation must follow these types.
 */

export type ModelMessage = ["system" | "user" | "assistant", string];

export type Model<ModelMessageFormat> = {
  // Turns ModelMessages into a model-specific messages format.
  generateMessages: ModelGenerateMessages<ModelMessageFormat>;
  completion: ModelCompletion<ModelMessageFormat>;
  completionStream: ModelCompletionStream<ModelMessageFormat>;
};

export type ModelGenerateMessages<ModelMessageFormat> = (
  messages: ModelMessage[]
) => ModelMessageFormat[];

export type ModelCompletion<ModelMessageFormat> = (args: {
  id: string;
  messages: ReturnType<ModelGenerateMessages<ModelMessageFormat>>;
}) => Promise<Response<{ choices: string[] }>>;

export type ModelCompletionStream<ModelMessageFormat> = (args: {
  id: string;
  messages: ReturnType<ModelGenerateMessages<ModelMessageFormat>>;
}) => Promise<Response<RemixStreamingTextResponse>>;

/**
 * Chains types.
 *
 * A chain an async function that executes an arbitrarty number of steps, including calling a LLM.
 * Chain files are modules that export a createChain factory.
 * Each instance generated by the factory gets a reference to a model client (types below)
 * and a context object which includes input data such as prompt and other relevant methods for the chain.
 *
 * Additionally each chain should export types for Context and Response data (using these names) both as zod and TypeScript types.
 * zod types must have a Schema suffix. For example Response.
 */

export type ModelResponse<ResponseData> = Response<ResponseData> & {
  llmMessages: ModelMessage[];
};

export type Chain<Model, Context, ResponseData> = (args: {
  model: Model;
  context: Context;
}) => Promise<ModelResponse<ResponseData>>;
