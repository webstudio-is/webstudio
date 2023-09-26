import type { templateGenerator } from "@webstudio-is/ai";

export type SectionId = string;
export type GenerationState =
  | {
      status: "idle";
    }
  | {
      status: "pending";
      abortController: AbortController;
    }
  | {
      status: "pendingAll";
      abortController: AbortController;
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "done";
      data: templateGenerator.Response;
      index: number;
    };

export type Section = {
  name: string;
  description: string;
  state: GenerationState;
};

export type Sections = Record<SectionId, Section>;
