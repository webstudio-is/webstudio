import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
  Kbd,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import { $commandMetas } from "~/shared/commands-emitter";
import { emitCommand } from "~/builder/shared/commands";
import { humanizeString } from "~/shared/string-utils";
import { closeCommandPanel } from "../command-state";
import type { BaseOption } from "../shared/types";

export type CommandOption = BaseOption & {
  type: "command";
  name: string;
  label: string;
  keys?: string[];
  keepCommandPanelOpen?: boolean;
};

import { $isCommandPanelOpen } from "../command-state";

export const $commandOptions = computed(
  [$isCommandPanelOpen, $commandMetas],
  (isOpen, commandMetas) => {
    if (!isOpen) {
      return [];
    }
    const commandOptions: CommandOption[] = [];
    for (const [name, meta] of commandMetas) {
      if (!meta.hidden) {
        const label = meta.label ?? humanizeString(name);
        const keys = meta.defaultHotkeys?.[0]?.split("+");
        commandOptions.push({
          terms: ["shortcuts", "commands", label],
          type: "command",
          name,
          label,
          keys,
          keepCommandPanelOpen: meta.keepCommandPanelOpen,
        });
      }
    }
    commandOptions.sort(
      (left, right) => (left.keys ? 0 : 1) - (right.keys ? 0 : 1)
    );
    return commandOptions;
  }
);

export const CommandsGroup = ({ options }: { options: CommandOption[] }) => {
  return (
    <CommandGroup
      name="command"
      heading={
        <CommandGroupHeading>Commands ({options.length})</CommandGroupHeading>
      }
      actions={[{ name: "execute", label: "Execute" }]}
    >
      {options.map(({ name, label, keys, keepCommandPanelOpen }) => (
        <CommandItem
          key={name}
          // preserve selected state when rerender
          value={name}
          onSelect={() => {
            if (!keepCommandPanelOpen) {
              closeCommandPanel();
            }
            emitCommand(name as never);
          }}
        >
          <Text>{label}</Text>
          {keys && <Kbd value={keys} />}
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
