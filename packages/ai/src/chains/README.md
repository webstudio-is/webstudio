# Chains

A chain an async function that executes an arbitrarty number of steps, including calling a LLM via a [model client](../models).

For example a chain can be used to manipulate some input data, make a LLM call and then parse, validate and transform the result.

Chain files are modules that export a `createChain` factory. Each instance created by the factory gets a reference to a `model` client and a `context` object which includes input data such as prompt and other relevant methods for the specific chain.

Additionally each chain should export types for `Context` and `Response` data (using these names) both as zod and TypeScript types.
zod types must have a `Schema` suffix, for example `ResponseSchema`.

Generally you use chains server-side in your API request handler.

## Example Chain

chains/vibes/index.ts

```typescript
import { z } from "zod";
import type {
  Model as BaseModel,
  ModelMessage,
  ChainStream,
} from "../../types";
import { formatPrompt } from "../../utils/format-prompt";

export const ContextSchema = z.object({
  // A message from a user.
  message: z.string(),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = z.string();
export type Response = z.infer<typeof ResponseSchema>;

export const createChain = <ModelMessageFormat>(): ChainStream<
  BaseModel<ModelMessageFormat>,
  Response,
  Context
> =>
  async function chain({ model, context }) {
    const { message } = context;

    const userMessage: ModelMessage = [
      "user",
      formatPrompt(
        { message },
        `
What is the vibe of the following message?

\`\`\`
{message}
\`\`\`

Reply with "positive" or "negative"`
      ),
    ];

    const messages = model.generateMessages([userMessage]);

    const response = await model.request({ messages });

    if (response.success == false) {
      return response;
    }

    if (response.choices[0].includes("negative")) {
      return {
        success: false,
        status: 403,
        statusText: "Forbidden",
        message: "Not cool. Try with a nice message instead.",
      };
    }

    return response;
  };
```

## Example Usage

Server side:

```typescript
import {
  vibes,
  createGptModel
  type GPTModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { message } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = vibes.createChain<GPTModelMessageFormat>();

  return chain({
    model,
    context: {
      message
    }
  })
}
```
