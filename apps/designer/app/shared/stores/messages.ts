import { useEffect } from "react";
import { z } from "zod";
import { subscribe } from "~/shared/pubsub";
import { StylesMessage } from "./styles";

const UnknownMessage = z.object({
  store: z.literal("unknown"),
});

const Message = z.union([StylesMessage, UnknownMessage]);

type Message = z.infer<typeof Message>;

export const Messages = z.array(Message);

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    update: Message[];
  }
}

let queue: Message[] = [];

export const queueMessages = (newMessages: Message[]) => {
  queue = [...queue, ...newMessages];
};

export const syncMessages = () => {
  const messages = queue;
  queue = [];
  return messages;
};

export const useSubscribeMessages = () => {
  useEffect(() => {
    return subscribe("update", (messages) => {
      queueMessages(messages);
    });
  }, []);
};
