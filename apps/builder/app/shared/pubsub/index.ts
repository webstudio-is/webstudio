import { atom } from "nanostores";
import { createPubsub } from "./create";

export interface PubsubMap {
  command: {
    source: string;
    name: string;
  };
}

export const { publish, usePublish, useSubscribe, subscribe } =
  createPubsub<PubsubMap>();
export type Publish = typeof publish;
export type UsePublish = typeof usePublish;

export const $publisher = atom<{
  publish: Publish;
}>({
  publish: () => {},
});
