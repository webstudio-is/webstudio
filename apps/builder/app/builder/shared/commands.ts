import { createCommandsEmitter } from "~/shared/commands-emitter";
import { $isPreviewMode } from "~/shared/nano-states";

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  source: "builder",
  commands: [
    {
      name: "togglePreview",
      defaultHotkeys: ["meta+shift+p", "ctrl+shift+p"],
      handler: () => {
        $isPreviewMode.set($isPreviewMode.get() === false);
      },
    },
  ],
});
