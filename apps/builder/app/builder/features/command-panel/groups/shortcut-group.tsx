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

export type ShortcutOption = {
  terms: string[];
  type: "shortcut";
  name: string;
  label: string;
  keys?: string[];
};

export const $shortcutOptions = computed([$commandMetas], (commandMetas) => {
  const shortcutOptions: ShortcutOption[] = [];
  for (const [name, meta] of commandMetas) {
    if (!meta.hidden) {
      const label = meta.label ?? humanizeString(name);
      const keys = meta.defaultHotkeys?.[0]?.split("+");
      shortcutOptions.push({
        terms: ["shortcuts", "commands", label],
        type: "shortcut",
        name,
        label,
        keys,
      });
    }
  }
  shortcutOptions.sort(
    (left, right) => (left.keys ? 0 : 1) - (right.keys ? 0 : 1)
  );
  return shortcutOptions;
});

export const ShortcutGroup = ({ options }: { options: ShortcutOption[] }) => {
  return (
    <CommandGroup
      name="shortcut"
      heading={<CommandGroupHeading>Shortcuts</CommandGroupHeading>}
      actions={["execute"]}
    >
      {options.map(({ name, label, keys }) => (
        <CommandItem
          key={name}
          // preserve selected state when rerender
          value={name}
          onSelect={() => {
            closeCommandPanel();
            emitCommand(name as never);
          }}
        >
          <Text variant="labelsSentenceCase">{label}</Text>
          {keys && <Kbd value={keys} />}
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
