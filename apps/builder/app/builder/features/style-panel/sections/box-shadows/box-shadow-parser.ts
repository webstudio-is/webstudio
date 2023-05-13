import { parse, stringify } from "css-box-shadow";

export const parseBoxShadow = (boxShadow: string) => {
  let tokenStream = boxShadow.trim();
  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cleanupKeywords = ["box-shadow:"];

  for (const cleanupKeyword of cleanupKeywords) {
    tokenStream = tokenStream.startsWith(cleanupKeyword)
      ? tokenStream.slice(cleanupKeyword.length).trim()
      : tokenStream;
  }

  const layers = parse(tokenStream).map((layer) => {
    return stringify([layer]);
  });
  console.log(layers);
};
