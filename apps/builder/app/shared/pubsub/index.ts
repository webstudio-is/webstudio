import { createPubsub } from "./create";

export interface PubsubMap {
  command: {
    source: string;
    name: string;
  };
}

export const { registerIframe, publish, useSubscribe, subscribe } =
  createPubsub<PubsubMap>();
export type Publish = typeof publish;
