# AI

Webstudio AI.

## Architecture

API route gets a request with the following shape:

```typescript
type ActionData = {
  // User request/prompt
  prompt: string;
  // Optional history of messages
  messages: Array<["system" | "user" | "assistant", string]>;
  // Selected instance id
  instanceId: string;
  projectId: Project["id"];
  buildId?: Build["id"];
} & (
  | {
      _action: "generate";
      // Generation can be in steps
      steps: Array<"instances" | "styles">;
    }
  | {
      _action: "edit";
      steps: Array<"edit">;
    }
);
```

Work with chains: async functions with the following signature

```typescript
export type Chain<ModelMessageFormat, ModelConfig> = (
  context: ChainContext<ModelMessageFormat, ModelConfig>
) => Promise<ChainResponse>;

export type ChainMessage = ["system" | "user" | "assistant", string];
export type ChainMessages = Array<ChainMessage>;

export type ChainContext<ModelMessageFormat, ModelConfig> = {
  api: {
    getBuild: (data: {
      projectId: Project["id"];
      buildId?: Build["id"];
    }) => Promise<Build>;
  };
  model: {
    config: ModelConfig;
    request: ModelRequest<ModelMessageFormat, ModelConfig>;
    generateMessages: ModelGenerateMessages<ModelMessageFormat>;
  };
  prompts: Record<string, string>;
  messages: ChainMessages;
  projectId: Project["id"];
  buildId?: Build["id"];
  instanceId: string;
};

type ChainResponse = {
  // the LLM chat
  llmMessages: ChainMessages[];
  // collection of code snippets
  code: string[];
  json: JsonObject[];
};
```
