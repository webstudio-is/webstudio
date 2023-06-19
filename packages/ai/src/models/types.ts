import type { ChainMessages } from "../chains";

export type ModelGenerateMessages<ModelMessage> = (
  messages: ChainMessages
) => ModelMessage[];

export type ModelGenerateImage = (prompt: string) => Promise<string>;

export type ModelRequest<ModelMessageFormat> = ({
  messages,
}: {
  messages: ReturnType<ModelGenerateMessages<ModelMessageFormat>>;
}) => Promise<string>;

export type Model<ModelMessageFormat> = {
  generateMessages: ModelGenerateMessages<ModelMessageFormat>;
  generateImage: ModelGenerateImage;
  request: ModelRequest<ModelMessageFormat>;
};
