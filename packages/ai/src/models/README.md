# Models

The Webstudio AI package contemplates a generic, vendor-agnostic messages format and LLM client.

Each vendor (eg. OpenAI) implementation follows the same API and is passed to [chains](../chains) which can use them to interact with a model. This allows to swap LLM without having to modify the chain(s).

```tsx
export type Model<ModelMessageFormat> = {
  // Turns ModelMessages into a model-specific messages format.
  generateMessages: ModelGenerateMessages<ModelMessageFormat>;
  // JSON completion.
  completion: ModelCompletion<ModelMessageFormat>;
  // Streaming completion.
  completionStream: ModelCompletionStream<ModelMessageFormat>;
};
```

Currently the package offers an implementation that allows to use OpenAI's Chat Completion endpoint.

Please refer to the [type definitions](../types.ts) for the baseline vendor-agnostic format and the [OpenAI implementation](./gpt.ts) in this folder for an example.
