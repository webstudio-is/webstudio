import OpenAI from "openai";
import { OpenAIStream } from "ai";
import type {
  Model as BaseModel,
  ModelCompletion,
  ModelCompletionStream,
  ModelGenerateMessages,
} from "../types";
import { createErrorResponse } from "../utils/create-error-response";
import { RemixStreamingTextResponse } from "../utils/remix-streaming-text-response";

export type Model = BaseModel<ModelMessageFormat>;
export type ModelMessageFormat = OpenAI.Chat.Completions.ChatCompletionMessage;

export type ModelConfig = {
  apiKey: string;
  organization: string;
  temperature: number;
  model?: "gpt-3.5-turbo" | "gpt-3.5-turbo-16k" | "gpt-4" | "gpt-4-32k";
  endpoint?: string;
};

export const create = function createModel(config: ModelConfig): Model {
  return {
    generateMessages,
    completion: createCompletion(config),
    completionStream: createCompletionStream(config),
  };
};

export const generateMessages: ModelGenerateMessages<ModelMessageFormat> = (
  messages
) => {
  return messages.map(([role, content]) => ({ role, content }));
};

export const createCompletion = (
  config: ModelConfig
): ModelCompletion<ModelMessageFormat> =>
  async function completion({
    id,
    messages,
  }: {
    id: string;
    messages: ModelMessageFormat[];
  }) {
    try {
      const openai = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
      });

      const completion = await openai.chat.completions.create({
        model: config.model ?? "gpt-3.5-turbo",
        temperature: config.temperature,
        messages,
      });

      return {
        id,
        type: "json",
        success: true,
        tokens: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
        },
        data: {
          choices: completion.choices.map(
            (choice) => choice?.message?.content || ""
          ),
        },
      } as const;
    } catch (error) {
      return errorToResponse(id, error);
    }
  };

export const createCompletionStream = (
  config: ModelConfig
): ModelCompletionStream<ModelMessageFormat> =>
  async function completeStream({
    id,
    messages,
  }: {
    id: string;
    messages: ModelMessageFormat[];
  }) {
    try {
      const openai = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
      });
      // Use polyfilled TransformStream because in Webstudio Builder
      // globalThis.fetch is overriden to @remix-run/web-fetch.
      //
      // @remix-run/web-fetch uses @remix-run/web-stream which polyfills ReadableStream
      // which has a runtime check on a private polyfill (web-streams-polyfill) property in .pipeThrough
      // Since `ai`'s OpenAIStream passes a non-polyfilled TransformStream the check above fails.
      //
      // To temporarily fix this we override TransformStream to use the web-streams-polyfill one which is
      // compatible with the one returned by @remix-run/web-fetch.
      //
      // @todo Remove this when https://github.com/remix-run/web-std-io/pull/42 is merged and
      // and Webstudio upgrades to that version.
      const { TransformStream } = await import("web-streams-polyfill");
      globalThis.TransformStream = TransformStream;

      const response = await openai.chat.completions.create({
        stream: true,
        model: config.model ?? "gpt-3.5-turbo",
        temperature: config.temperature,
        messages,
      });

      const stream = OpenAIStream(response);
      return {
        id,
        type: "stream",
        success: true,
        data: new RemixStreamingTextResponse(stream),
        tokens: {
          prompt: -1,
          completion: -1,
        },
      } as const;
    } catch (error) {
      return errorToResponse(id, error);
    }
  };

const errorToResponse = (id: string, error: unknown) => {
  let status = 500;
  let debug =
    error != null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  if (error instanceof OpenAI.APIError) {
    if (typeof error.status === "number") {
      status = error.status;
    }
    debug += `\n ${error.message}`;
  }

  return {
    id,
    ...createErrorResponse({
      status,
      error: getErrorType(error, status),
      message: debug,
      debug,
    }),
  } as const;
};
const getErrorType = (error: unknown, status: number) => {
  if (error instanceof OpenAI.APIError) {
    if (error.code && error.code in errorCodes) {
      return `ai.${errorCodes[error.code as keyof typeof errorCodes]}`;
    }
    if (status in errorHttpCodes) {
      return `ai.${errorHttpCodes[status as keyof typeof errorHttpCodes]}`;
    }
  }
  return `ai.unknownError`;
};

const errorCodes = {
  context_length_exceeded: "contextLengthExceeded",
  rate_limit_exceeded: "rateLimitExceeded",
  insufficient_quota: "spendingQuotaLimitReached",
};

const errorHttpCodes = {
  401: "invalidAuthOrApiKey",
  503: "engineOverloaded",
};
