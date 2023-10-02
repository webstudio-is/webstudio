//import { Blob } from "node:buffer";
import OpenAI, { toFile } from "openai";
import type {
  Model as BaseModel,
  ErrorResponse,
  ModelGenerateMessages,
} from "../types";

export type Model = BaseModel<ModelMessageFormat>;
export type ModelMessageFormat = OpenAI.Audio.Transcriptions.Transcription;

export type ModelConfig = {
  apiKey: string;
  organization: string;
  temperature: number;
  model?: "whisper-1";
  endpoint?: string;
};

export const create = function createModel(config: ModelConfig) {
  return {
    request: createRequest(config),
  };
};

export const generateMessages: ModelGenerateMessages<ModelMessageFormat> = (
  messages
) => {
  return messages.map(([text]) => ({ text }));
};
const createRequest = (config: ModelConfig) =>
  async function request({ audio }: { audio: string }) {
    const openai = new OpenAI(config);
    const file = await toFile(Buffer.from(audio, "base64"), "sound.wav");
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return {
      success: true,
      text: transcription.text,
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
