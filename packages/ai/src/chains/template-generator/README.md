# Template Generator Chain

Uses Streaming: `false`.

Given a UI section or widget description, this chain generates a Webstudio Embed Template representing the UI.

## Usage

Server side:

```typescript
import {
  templateGenerator,
  createGptModel
  type GptModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { prompt, components } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = templateGenerator.createChain<GptModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt,
      components, // This is an array of available component names.
    }
  });

  // response.data contains the template

  return response;
}
```

Client side:

```tsx
import { templateGenerator, handleAiRequest } from "@webstudio-is/ai";

function UiComponent() {
  const [error, setError] = useState();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (isLoading) {
          return;
        }

        const formData = new FormData(event.currentTarget);
        const prompt = formData.get("prompt");
        const components = formData.get("components");

        if (typeof prompt !== "string" || typeof components !== "string") {
          return;
        }

        handleAiRequest<templateGenerator.Response>(
          fetch("/rest/ai/template-generator", {
            method: "POST",
            body: JSON.stringify({
              prompt,
              components: JSON.parse(components) || [],
            }),
          })
        ).then((response) => {
          if (response.success) {
            // Log the template
            console.log(response.data);
          }
        });
      }}
    >
      <label>
        Prompt
        <textarea name="prompt" />
      </label>

      <input
        type="hidden"
        name="components"
        defaultValue='["Box","Heading","Image","Text"]'
      />

      <button disabled={isLoading}>Generate Section</button>
    </form>
  );
}
```
