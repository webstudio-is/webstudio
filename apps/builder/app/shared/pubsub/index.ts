import { atom } from "nanostores";
import { createPubsub } from "./create";

/**
 * Module augmentation pattern for type-safe command subscriptions.
 *
 * This pattern allows each module to declare their own commands without
 * creating a central list that knows about every command in the application.
 *
 * Usage:
 *
 * 1. Declare your command in the module where it's used:
 *
 *    declare module "~/shared/pubsub" {
 *      interface CommandRegistry {
 *        myCommand: undefined;
 *        commandWithPayload: { data: string };
 *      }
 *    }
 *
 * 2. Subscribe to the command with full type safety:
 *
 *    subscribe("command:myCommand", () => {
 *      // handler receives no payload (undefined)
 *    });
 *
 *    subscribe("command:commandWithPayload", (payload) => {
 *      // payload is typed as { data: string }
 *    });
 *
 * 3. TypeScript will prevent subscribing to non-existent commands:
 *
 *    subscribe("command:typo", ...) // Type error!
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommandRegistry {
  // Base is empty - modules augment this
}

// Create a mapped type for command-specific subscriptions
type CommandSubscriptions = {
  [K in keyof CommandRegistry as `command:${K & string}`]: CommandRegistry[K];
};

export interface PubsubMap extends CommandSubscriptions {
  command: {
    source: string;
    name: string;
  };
}

export const { publish, usePublish, useSubscribe, subscribe } =
  createPubsub<PubsubMap>();
export type Publish = typeof publish;
export type UsePublish = typeof usePublish;

export const $publisher = atom<{ publish?: Publish }>({});
