import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import type {
  Model as BaseModel,
  ErrorResponse,
  ModelGenerateMessages,
  ModelRequest,
  ModelRequestStream,
} from "../types";

export type Model = BaseModel<ModelMessageFormat>;
export type ModelMessageFormat = OpenAI.Chat.Completions.ChatCompletionMessage;

export type ModelConfig = {
  apiKey: string;
  organization: string;
  temperature: number;
  model?: "gpt-3.5-turbo" | "gpt-3.5-turbo-16k" | "gpt-4";
  endpoint?: string;
};

export const create = function createModel(config: ModelConfig): Model {
  return {
    generateMessages,
    request: createRequest(config),
    requestStream: createRequestStream(config),
  };
};

export const generateMessages: ModelGenerateMessages<ModelMessageFormat> = (
  messages
) => {
  return messages.map(([role, content]) => ({ role, content }));
};

const createRequest = (config: ModelConfig): ModelRequest<ModelMessageFormat> =>
  async function request({ messages }) {
    const response = await fetch(
      config.endpoint ?? "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "OpenAI-Organization": config.organization,
        },
        body: JSON.stringify({
          model: config.model ?? "gpt-3.5-turbo",
          messages,
          temperature: config.temperature,
        }),
      }
    );

    if (response.ok === false) {
      return errorResponse(response);
    }

    const completion: OpenAI.Chat.Completions.ChatCompletion =
      await response.json();

    return {
      success: true,
      choices: completion.choices.map(
        (choice) => choice?.message?.content || ""
      ),
      tokens: {
        prompt: completion.usage?.prompt_tokens ?? 0,
        completion: completion.usage?.completion_tokens ?? 0,
      },
    };
  };

export const errorResponse = (response: Response): ErrorResponse => {
  let errorType = "ai.genericError";

  if ([401, 429, 500, 503].includes(response.status)) {
    errorType =
      OpenAIErrors[response.status as 401 | 429 | 500 | 503][
        response.statusText
      ] ?? "ai.genericError";
  }

  return {
    success: false,
    type: errorType,
    status: response.status,
    message: response.statusText,
  };
};

const OpenAIErrors: Record<401 | 429 | 500 | 503, { [key in string]: string }> =
  {
    401: {
      "Invalid Authentication": "ai.invalidAuth",
      "Incorrect API key provided": "ai.invalidApiKey",
      "You must be a member of an organization to use the API": "ai.invalidOrg",
    },
    429: {
      "Rate limit reached for requests": "ai.rateLimit",

      "You exceeded your current quota, please check your plan and billing details":
        "ai.quotaExceed",
    },
    500: {
      "The server had an error while processing your request":
        "ai.genericError",
    },
    503: {
      "The engine is currently overloaded, please try again later":
        "ai.overloaded",
    },
  };

const createRequestStream = (
  config: ModelConfig
): ModelRequestStream<ModelMessageFormat> =>
  async function requestStream({ messages }) {
    try {
      const openai = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
      });

      const response = await openai.chat.completions.create({
        stream: true,
        model: config.model ?? "gpt-3.5-turbo",
        temperature: config.temperature,
        messages,
      });

      const stream = OpenAIStream(response);
      return new StreamingTextResponse(stream);
    } catch (error) {
      let response = new Response(null, {
        status: 500,
        statusText: "",
      });

      if (error instanceof OpenAI.APIError) {
        const { status, message } = error;
        response = new Response(null, {
          status,
          statusText: message,
        });
      }

      return errorResponse(response);
    }
  };
