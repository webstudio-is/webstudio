import type {
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
} from "openai";
import type {
  Model as BaseModel,
  ModelGenerateMessages,
  ModelRequest,
} from "./types";

export type Model = BaseModel<ModelMessageFormat>;
export type ModelMessageFormat = ChatCompletionRequestMessage;
export type ModelConfig = {
  apiKey: string;
  organization: string;
  temperature: number;
  model?: "gpt-3.5-turbo" | "gpt-4";
};

export const create = function createModel(config: ModelConfig): Model {
  return {
    generateMessages,
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
