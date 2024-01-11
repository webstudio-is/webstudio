# Copywriter chain

Uses Streaming: `true`.

Given a description and an Webstudio component instance id, this chain generates copy for the instance and all its descendant text nodes.

## Usage

Server side:

```typescript
import {
  copywriter,
  createGptModel
  type GptModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { prompt, projectId, textInstances } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = copywriter.createChain<GptModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt,
      textInstances
    }
  });

  if (response.success === false) {
    return response;
  }

  // Respond with the text generation stream.
  return response.stream;
}
```

Client side:

```tsx
import {
  copywriter,
  handleAiRequest,
  type RemixStreamingTextResponse
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
        const projectId = formData.get("projectId");
        const textInstances = formData.get("textInstances");

        if (
          typeof prompt !== "string" ||
          typeof projectId !== "string" ||
          typeof textInstances !== "string"
        ) {
          return;
        }

        handleAiRequest<RemixStreamingTextResponse>(
          fetch(
            '/rest/ai/copy',
            {
              method: "POST",
              body: JSON.stringify({
                prompt,
                projectId,
                textInstances: JSON.parse(textInstances),
              }),
              signal: abort.current.signal,
            },
          ),
          {
            signal: abort.current.signal,
            onChunk: (id, { completion, done }) => {
              // Log the completion.
              console.log(completion)
              if (done) {
                doSomething(completion);
              }
            },
          }
        ).then((result) => {
          abort.current = null;
          if (typeof result !== "string") {
            alert("Error " + result.type);
          }
          setIsLoading(false);
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
