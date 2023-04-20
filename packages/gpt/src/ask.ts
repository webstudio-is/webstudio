#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "fs-extra";
import { OpenAIStream } from "./openai-stream";

const args = process.argv.slice(2);

let step = args.findIndex((arg) => arg === "--step");
if (step != -1) {
  const removed = args.splice(step, 2);
  step = Number(removed[1]);
}

const writeTo = typeof args[1] === "string" ? args[1] || null : null;

const run = async () => {
  const responses: string[] = [];

  let chain = promptChain(fs.readFileSync(args[0], "utf-8"));
  if (step !== -1) {
    chain = [chain[step - 1]];
  }

  for (let i = 0; i < chain.length; i++) {
    const prompt = [{ role: "user", content: chain[i] }];

    if (i > 0) {
      prompt.unshift({ role: "assistant", content: responses[i - 1] });
    }

    responses.push("");

    await OpenAIStream({
      prompt,
      apiKey: process.env.OAI_KEY,
      organization: process.env.OAI_ORG,
      maxTokens: 2000,
      onChunk: (chunk) => {
        console.log(chunk.endsWith("\n") ? chunk.slice(0, -1) : chunk);
        responses[i] += chunk;
      },
    });
  }

  if (writeTo && responses.length) {
    const out = responses.join("\n\n---\n\n").trim();
    console.log(out);
    out && fs.writeFileSync(writeTo, out);
  }
};

run();

function promptChain(prompt) {
  let steps = [""];

  prompt.split("\n").forEach((l) => {
    if (l.startsWith("---")) {
      steps.push("");
    } else {
      steps[steps.length - 1] += `${l}\n`;
    }
  });

  return steps;
}
