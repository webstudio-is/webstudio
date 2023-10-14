import { restAi } from "~/shared/router-utils";
import type { action } from "~/routes/rest.ai.audio.transcriptions";
import {
  AiApiException,
  RateLimitException,
  textToRateLimitMeta,
} from "./api-exceptions";

export const fetchTranscription = async (file: File) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(restAi("audio/transcriptions"), {
    method: "POST",
    body: formData,
  });

  if (response.ok === false) {
    const text = await response.text();

    if (response.status === 429) {
      const meta = textToRateLimitMeta(text);
      throw new RateLimitException(text, meta);
    }

    throw new Error(
      `Fetch error status="${response.status}" text="${text.slice(0, 1000)}"`
    );
  }

  // @todo add response parsing
  const result: Awaited<ReturnType<typeof action>> = await response.json();

  if (result.success) {
    return result.data.text;
  }

  throw new AiApiException(result.error.message);
};
