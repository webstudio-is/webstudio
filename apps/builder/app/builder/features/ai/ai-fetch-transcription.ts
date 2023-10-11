import { restAi } from "~/shared/router-utils";

export const fetchTranscription = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(restAi("audio/transcriptions"), {
    method: "POST",
    body: formData,
  });

  if (response.ok === false) {
    // @todo: show error
    return;
  }

  // @todo add response parsing
  const { text } = await response.json();

  return text;
};
