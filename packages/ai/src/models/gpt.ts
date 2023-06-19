import type {
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
} from "openai";
import type {
  Model as BaseModel,
  ModelGenerateImage,
  ModelGenerateMessages,
  ModelRequest,
} from "./types";

export type Model = BaseModel<ModelMessageFormat>;
export type ModelMessageFormat = ChatCompletionRequestMessage;
export type ModelConfig = {
  apiKey: string;
  organization: string;
  temperature: number;
  model?:
    | "gpt-3.5-turbo"
    | "gpt-3.5-turbo-16k"
    | "gpt-3.5-turbo-16k-0613"
    | "gpt-4";
};

export const create = function createModel(config: ModelConfig): Model {
  return {
    generateMessages,
    generateImage: createGenerateImages(config),
    request: createRequest(config),
  };
};

export const generateMessages: ModelGenerateMessages<ModelMessageFormat> = (
  messages
) => {
  return messages.map(([role, content]) => ({ role, content }));
};

const createRequest = (config: ModelConfig): ModelRequest<ModelMessageFormat> =>
  async function request({ messages }) {
    const completion: CreateChatCompletionResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "OpenAI-Organization": config.organization,
        },
        body: JSON.stringify({
          model: config.model || "gpt-3.5-turbo",
          messages,
          temperature: config.temperature,
        }),
      }
    ).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`${response.status}: ${response.statusText}`);
    });

    const content = completion.choices[0].message?.content.trim() || "";
    if (!content) {
      throw new Error("GPT completion has 0 results");
    }
    return content;
  };

const createGenerateImages = (config: ModelConfig): ModelGenerateImage =>
  async function generateImage(prompt: string) {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "OpenAI-Organization": config.organization,
        },
        body: JSON.stringify({
          prompt,
          n: 1,
          size: "512x512",
          response_format: "url",
        }),
      }
    ).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`${response.status}: ${response.statusText}`);
    });

    return response.data[0].url;
  };
