import { Configuration, OpenAIApi } from "openai";

export const OpenAIStream = async function OpenAIStream({
  prompt,
  apiKey,
  organization,
  model = "gpt-3.5-turbo",
  maxTokens = 50,
  onChunk = (line) => undefined,
}: {
  prompt: { role: string; content: string }[];
  apiKey: string;
  organization: string;
  model: string;
  maxTokens: number;
  onChunk: (line: string) => void;
}) {
  if (typeof organization !== "string" || !organization.startsWith("org-")) {
    throw new Error("organization missing");
  }
  const configuration = new Configuration({
    apiKey,
    organization,
  });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createChatCompletion(
    {
      model,
      messages: prompt,
      max_tokens: maxTokens,
      temperature: 0,
      stream: true,
    },
    { responseType: "stream" }
  );

  let onDone, onError;
  const streamPromise = new Promise((resolve, reject) => {
    onDone = resolve;
    onError = reject;
  });

  const stream = response.data;
  let chunks = [];

  stream.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line: string) => line.trim() !== "");

    const chunk = "";
    for (const line of lines) {
      const message = line.replace(/^data: /, "");
      if (message === "[DONE]") {
        onChunk(chunks.join(""));
        return;
      }
      try {
        const parsed = JSON.parse(message);
        const text = parsed.choices[0].delta.content;
        if (typeof text === "string") {
          if (text.endsWith("\n")) {
            chunks.push(text.slice(0, -1));
            console.log(chunks.join(""));
            chunks = [];
          } else {
            chunks.push(text);
          }
        }
      } catch (error) {
        console.error("Could not JSON parse stream message", message, error);
      }
    }
  });

  stream.on("end", () => {
    onChunk(chunks.join(""));
    onDone();
  });
  stream.on("error", (e: Error) => onError(e.message));

  return streamPromise;
};
