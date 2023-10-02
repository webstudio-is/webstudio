import { isHotkeyPressed } from "react-hotkeys-hook";
import { atom, onMount } from "nanostores";
import store from "immerhin";
import { $publisher, subscribe } from "~/shared/pubsub";

type CommandMeta<CommandName extends string> = {
  // @todo category, description
  name: CommandName;
  /** default because hotkeys can be customized from ui */
  defaultHotkeys?: string[];
  /** listen hotkeys only locally without sharing with other apps */
  disableHotkeyOutsideApp?: boolean;
  /**
   * input, select and textarea will not invoke command when hotkey is hit
   * with the exception when default event behavior is prevented
   **/
  disableHotkeyOnFormTags?: boolean;
  /**
   * element with contenteditable=true will not invoke command
   * when hotkey is hit with the exception when default
   * event behavior is prevented
   **/
  disableHotkeyOnContentEditable?: boolean;
};

type CommandHandler = () => void;

/**
 * Command can be registered by builder, canvas or plugin
 */
export type Command<CommandName extends string> = CommandMeta<CommandName> & {
  /**
   * Command handler accepting source where was triggered
   * which is builder, canvas or plugin name
   */
  handler: CommandHandler;
};

/*
 * expose command metas to synchronize between builder, canvas and plugins
 */
export const $commandMetas = atom(new Map<string, CommandMeta<string>>());

export const createCommandsEmitter = <CommandName extends string>({
  source,
  commands,
}: {
  source: string;
  // type only input to describe available commands from builder or other plugins
  externalCommands?: CommandName[];
  commands: Command<CommandName>[];
}) => {
  const commandHandlers = new Map<string, CommandHandler>();
  for (const { handler, ...meta } of commands) {
    commandHandlers.set(meta.name, handler);
  }

  if (commands.length > 0) {
    onMount($commandMetas, () => {
      // listener from sync-stores is called after onMount callback
      // schedule store.set to the next tick
      // so store.listen is executed after store.set below
      Promise.resolve().then(() => {
        store.createTransaction([$commandMetas], (commandMetas) => {
          for (const { handler, ...meta } of commands) {
            commandMetas.set(meta.name, meta);
          }
        });
      });
    });
  }

  const emitCommand = (name: CommandName) => {
    const { publish } = $publisher.get();
    publish({
      type: "command",
      payload: {
        source,
        name,
      },
    });
  };

  /**
   * subscribe to keydown in every app and emit command globally
   * actual handlers are executed in app where defined
   */
  const subscribeCommands = () => {
    const unsubscribePubsub = subscribe("command", ({ name }) => {
      commandHandlers.get(name)?.();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      const commandMetas = $commandMetas.get();
      let emitted = false;
      for (const commandMeta of commandMetas.values()) {
        if (commandMeta.defaultHotkeys === undefined) {
          continue;
        }
        if (
          commandMeta.defaultHotkeys.some((hotkey) =>
            isHotkeyPressed(hotkey.split("+"))
          ) === false
        ) {
          continue;
        }
        if (
          commandMeta.disableHotkeyOutsideApp &&
          commandHandlers.has(commandMeta.name) === false
        ) {
          continue;
        }
        const element = event.target as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        const isOnFormTags = ["input", "select", "textarea"].includes(tagName);
        const isOnContentEditable = element.isContentEditable;
        const { disableHotkeyOnFormTags, disableHotkeyOnContentEditable } =
          commandMeta;
        // in some cases hotkey override default behavior
        // on form tags and contentEditable
        // though still proceed when default behavior is prevented
        // this hack makes hotkeys work on canvas instances of input etc.
        if (
          isOnFormTags &&
          disableHotkeyOnFormTags &&
          event.defaultPrevented === false
        ) {
          continue;
        }
        if (
          isOnContentEditable &&
          disableHotkeyOnContentEditable &&
          event.defaultPrevented === false
        ) {
          continue;
        }
        emitted = true;
        emitCommand(commandMeta.name as CommandName);
      }
      // command can redefine browser hotkeys
      // always prevent to avoid unexpected behavior
      if (emitted) {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unsubscribePubsub();
      document.removeEventListener("keydown", handleKeyDown);
    };
  };

  return {
    emitCommand,
    subscribeCommands,
  };
};
