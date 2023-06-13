import type { Project } from "@webstudio-is/project";
import type { Build } from "@webstudio-is/project-build";
import type { JsonArray, JsonObject } from "type-fest";

export type Chain<Model> = (request: {
  model: Model;
  context: ChainContext;
}) => Promise<ChainResponse>;

export type ChainMessage = ["system" | "user" | "assistant", string];
export type ChainMessages = Array<ChainMessage>;

export type ChainContext = {
  api: {
    getBuild: (data: {
      projectId: Project["id"];
      buildId?: Build["id"];
    }) => Promise<Build>;
  };
  prompts: { [variable in string]: string }; // Record<string, string>;
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
  json: (JsonObject | JsonArray)[];
};

export type ElementType<T> = T extends (infer U)[] ? U : never;
