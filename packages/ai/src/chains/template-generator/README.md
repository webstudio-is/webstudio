# Template Generator Chain

Uses Streaming: `false`.

Given a UI section or widget description, this chain generates a Webstudio Embed Template representing the UI.

## Usage

Server side:

```typescript
import {
  templateGenerator,
  createGptModel
  type GPTModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { prompt, components } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = templateGenerator.createChain<GPTModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt,
      components, // This is an array of available component names.
    }
  });

  if (response.success === false) {
    return response;
  }

  return {
    success: true,
    data: response.data,
  };
}
```

Client side:

```tsx
import {
  templateGenerator,
  request,
  type ErrorResponse,
} from "@webstudio-is/ai";

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

        request<templateGenerator.Response>([
          "/rest/ai/template-generator",
          {
            method: "POST",
            body: JSON.stringify({
              prompt,
              components: JSON.parse(components) || [],
            }),
          },
        ]).then((response) => {
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
