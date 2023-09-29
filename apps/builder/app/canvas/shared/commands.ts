import { createCommandsEmitter } from "~/shared/commands-emitter";

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  source: "canvas",
  commands: [],
});
