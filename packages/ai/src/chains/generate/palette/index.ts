import type { Model as BaseModel } from "../../../models/types";
import { type Chain } from "../../types";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    throw new Error("Not implemented");

    return {
      llmMessages: [],
      code: [],
      json: [],
    };
  };
