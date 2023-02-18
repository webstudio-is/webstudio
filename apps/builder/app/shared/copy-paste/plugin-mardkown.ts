import { micromark } from "micromark";

const options = { extensions: [] };
export const mimeType = "text/plain";

export const onPaste = (clipboardData: string) => {
  const data = micromark(clipboardData, options);
  console.log(data);
};
