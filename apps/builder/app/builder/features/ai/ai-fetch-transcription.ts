import { restAi } from "~/shared/router-utils";

export const fetchTranscription = async (file: File, signal: AbortSignal) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(restAi("audio/transcriptions"), {
    method: "POST",
    body: formData,
    signal,
  });

  if (response.ok === false) {
    throw new Error("Something went wrong.");
  }

  // @todo add response parsing
  const { text } = await response.json();

  return text;
};
