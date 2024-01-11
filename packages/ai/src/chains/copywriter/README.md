# Copywriter chain

Uses Streaming: `true`.

Given a description and an Webstudio component instance id, this chain generates copy for the instance and all its descendant text nodes.

## Usage

Server side:

```typescript
import {
  copywriter,
  createGptModel
  type GPTModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { prompt, projectId, textInstances } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = copywriter.createChain<GPTModelMessageFormat>();

  // Respond with a stream.
  return chain({
    model,
    context: {
      prompt,
      textInstances
    }
  })
}
```

Client side:

```tsx
import { useCompletion } from "ai/react";
import { copywriter, type ErrorResponse } from "@webstudio-is/ai";

function UiComponent() {
  const [error, setError] = useState(null);
  const { completion, complete, stop, isLoading } = useCompletion({
    api: "/rest/ai/copy",
    onResponse: (response) => {
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        const json: ErrorResponse = await response.json();
        if (json.success === false) {
          setError(json.message);
        }
      }
    },
  });

  useEffect(() => {
    console.log(completion);
  }, [completion]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (isLoading) {
          return;
        }

        const formData = new FormData(event.currentTarget);
        const prompt = formData.get("prompt");
        const projectId = formData.get("projectId");
        const textInstances = formData.get("textInstances");

        if (
          typeof prompt !== "string" ||
          typeof projectId !== "string" ||
          typeof textInstances !== "string"
        ) {
          return;
        }

        complete(prompt, {
          body: {
            projectId,
            textInstances: JSON.parse(textInstances),
          },
        });
      }}
    >
      <label>
        Copy request
        <textarea name="prompt" />
      </label>

      {/* Webstudio Project ID */}
      <input type="hidden" name="projectId" value="123" />

      {/* */}
      <input
        type="hidden"
        name="textInstances"
        value={JSON.stringify(
          copywriter.collectTextInstances({
            new Map(webstudioBuild.instances),
            rootInstanceId: "123"
          })
        )}
      />

      <button disabled={isLoading}>Generate Copy</button>
    </form>
  );
}
```

Note that this is a streaming chain therefore the response will stream plain text which will need parsing. Given the simplicity of the task the response could be parsed incrementally and consumed right away. Below is a proof of concept:

```tsx
import untruncateJson from "untruncate-json";
import { copywriter } from "@webstudio-is/ai";

// ...

// within UiComponent

const [json, setJson] = useState([]);

useEffect(() => {
  try {
    const jsonResponse = z
      .array(copywriter.TextInstanceSchema)
      .parse(JSON.parse(untruncateJson(completion)));

    const currenTextInstance = jsonResponse.pop();

    if (currenTextInstance === undefined) {
      return;
    }

    console.clear();
    console.log(currenTextInstance);
    // patchTextInstance(currenTextInstance);
  } catch (error) {
    /**/
  }
}, [completion]);
```
