# Operations Chain

Uses Streaming: `false`.

Given a description, available components and an existing instance as JSX and CSS, it generates a series of edit operations to fulfill an edit request coming from the user.

## Architecture

At the core of this chain are a number of atomic operations that represent tasks that the LLM can do on an input Webstudio tree, converted to JSX and CSS.

Each operation is a file containing:

- `aiOperation`: an LLM-friendly operation schema to produce an operation to alter the input JSX and/or CSS.
- `wsOperation`: a Webstudio-friendly operation to apply a LLM-result (postprocessed or not) to a Webstudio project.
- `aiOperationToWs`: an utility to convert an `aiOperation` to a `wsOperation`.

### aiOperation

An aiOperation is a Zod schema definition for an object with a descriptive `operation` property that identifies the operation to do on the input JSX and CSS. The `operation` property is mandatory since it enables a discriminated union.

Each operation can define additional properties that the LLM will fill out based on the user request and task. For example an aiOperation can include a property indicating which JSX element to modify.

aiOperations are written in an LLM-friendly language and are located in the [operations](./operations) folder.

#### Usage in the Operations chain

The Operations chain from this module assumes that every JSX element has a Webstudio instance id in a `data-ws-id` attribute. The LLM will reference these ids to associate an operation with a particular element instance.

The chain converts a Zod union of all the supported operations to a JSON Schema definition that is injected in the LLM prompt. Additionally the LLM will get the Webstudio tree as JSX and CSS and a user prompt, and will respond with an array of operations to alter the input JSX.

Once the LLM responds with an array of aiOperations, these can be transformed to Webstudio-friendly operations with utilities called aiOperationToWs. The results of these transformations are called wsOperation.

For example an aiOperation might contain style changes in the form of Tailwind CSS classes and the companion `aiOperationToWs` can turn them into Webstudio-compatible styles returining a wsOperation.

Once all the wsOperations are ready they are sent to the client which has specific logic to apply each of these to the Webstudio project.

##### Special Case for User Interfaces

Generating quality user interfaces might be challenging with LLMs.

Having to do so within a generic operations framework like the one described above makes it even more challenging.

For this reason when it comes to generating user interfaces, the Operation chain instead offers an operation called [`generateTemplatePrompt`](./operations/generate-template-prompt.ts) that provides information about insertion point in the existing UI and a prompt, possibly enhanced.

Another chain can use these information and a more sophisticated prompt and model to then generate the user interface and return a [`generateInsertTemplate`](./operations/generate-insert-template.ts) wsOperation. Webstudio does exactly this in a rest endpoint, using the [`template-generator`](../template-generator) chain with gpt4 instead of gpt-3.5-turbo.

## Usage

Server side:

```typescript
import {
  operations,
  templateGenerator,
  createGptModel
  type GptModelMessageFormat
} from "@webstudio-is/ai";

export async function handler({ request }) {
  const { prompt, components, jsx } = await request.json();

  const model = createGptModel({
    apiKey: process.env.OPENAI_KEY,
    organization: process.env.OPENAI_ORG,
    temperature: 0.2,
    model: "gpt-3.5-turbo",
  });

  const chain = operations.createChain<GptModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt,
      components,
      jsx
    }
  });

  if (response.success === false) {
    return response;
  }

  const promptOperations = getGenerateTemplatePromptsWsOperations(response.data);

  if (promptOperations.length > 0) {
    const model = createGptModel({
      apiKey: process.env.OPENAI_KEY,
      organization: process.env.OPENAI_ORG,
      temperature: 0.2,
      model: "gpt-4",
    });
    const chain = templateGenerator.createChain<GptModelMessageFormat>();

    const results = await Promise.all(promptOperations.map(operation => chain({
      model,
      context: {
        prompt: operation.llmPrompt,
        components,
      }
    }));

    replaceGenerateTemplateWithInsertTemplateWsOperations(
      promptOperations,
      results,
      response,
    );
  }

  return {
    success: true,
    data: response.data,
  };
}
```

Client side:

```tsx
import { operations, request, type ErrorResponse } from "@webstudio-is/ai";
import { applyOperations } from "./apply-operations";

request<operations.Response>(
  [
    '/rest/ai/op',
    {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        components: getAvailableComponentsFromWebstudioMetas(...),
        jsx: getJsxAndCssForSelectedInstance(...),
      })
    }
  ]
).then((result) => {
  if (result.success) {
    applyOperations(result.data);
  }
});
```
