import { createCommandsEmitter } from "~/shared/commands-emitter";

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  commands: [],
});
