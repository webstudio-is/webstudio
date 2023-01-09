import type { StylesMessage } from "./styles";

type Message = StylesMessage;
export type Messages = Message[];

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    update: Messages;
  }
}
