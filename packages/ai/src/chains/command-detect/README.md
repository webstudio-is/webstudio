# Command Detection Chain

Uses Streaming: `false`.

Given a prompt and a list of possible commands and descriptions, it returns an array of operations matching the prompt request.

## Usage

```typescript
import {
  commandDetect,
  createGptModel
  type GptModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { prompt,  } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0,
    model: "gpt-3.5-turbo",
  });

  const chain = commandDetect.createChain<GptModelMessageFormat>();

  const result = await chain({
    model,
    context: {
      prompt,
      commands: {
        "copywriter": "writes, rewrites, translates text",
        "edit-styles": "edits styles",
        // ...
      }
    }
  });

  if (result.succes === true) {
    // An array of detected command names.
    console.info(result.data);
  }
}
```
