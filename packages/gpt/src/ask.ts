#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "fs-extra";
import { OpenAIStream } from "./openai-stream";

const prompt = [
  { role: "system", content: fs.readFileSync(process.argv[2], "utf-8") },
];

const writeTo =
  typeof process.argv[3] === "string" ? process.argv[3] || null : null;

const run = async () => {
  let chunks = "";

  await OpenAIStream({
    prompt,
    apiKey: process.env.OAI_KEY,
    organization: process.env.OAI_ORG,
    maxTokens: 2000,
    onChunk: (chunk) => {
      chunks += chunk;
      console.log(chunk);
    },
  });

  if (writeTo && chunks.trim()) {
    fs.writeFileSync(writeTo, chunks);
  }
};

run();
