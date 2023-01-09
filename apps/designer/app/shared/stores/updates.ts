import type { StylesUpdate } from "./styles";

export type Update = StylesUpdate;

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    update: Update[];
  }
}
