# Section Descriptions Chain

Uses Streaming: `false`.

Given a description, this chain generates a list of webpage section descriptions which contain title and description.

## Usage

Server side:

```typescript
import {
  sections,
  createGptModel
  type GPTModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { prompt } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = sections.createChain<GPTModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt
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
import { sections, request, type ErrorResponse } from "@webstudio-is/ai";

function UiComponent() {
  const [error, setError] = useState(null);
  const [sections, setSections] = useState({});

  useEffect(() => {
    console.log(sections);
  }, [sections]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (isLoading) {
          return;
        }

        const formData = new FormData(event.currentTarget);
        const prompt = formData.get("prompt");

        if (typeof prompt !== "string") {
          return;
        }

        request<sections.Response>([
          "/rest/ai/sections",
          {
            method: "POST",
            body: JSON.stringify({ prompt }),
          },
        ]).then((response) => {
          if (response.success) {
            setSections(response.data);
          }
        });
      }}
    >
      <label>
        Prompt
        <textarea name="prompt" />
      </label>

      <button disabled={isLoading}>Generate Section Descriptions</button>
    </form>
  );
}
```
