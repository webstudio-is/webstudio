import { Text } from "./text";

const isMac =
  typeof navigator === "object" ? /mac/i.test(navigator.platform) : false;

const shortcutSymbolMap: Record<string, string> = {
  cmd: isMac ? "⌘" : "Ctrl",
  shift: "⇧",
  option: isMac ? "⌥" : "Alt",
  backspace: "⌫",
  enter: "↵",
  tab: isMac ? "tab" : "Tab",
  click: isMac ? "+click" : "+ Click",
};

type ShortcutDefinition = ReadonlyArray<string>;

const format = (value: ShortcutDefinition) => {
  return value.map(
    (shortcut) => shortcutSymbolMap[shortcut] ?? shortcut.toUpperCase()
  );
};

export const Kbd = ({
  value,
  color = "subtle",
}: {
  value: ShortcutDefinition;
  color?: "subtle" | "moreSubtle";
}) => {
  return (
    <Text color={color} as="kbd">
      {format(value).join(isMac ? "" : " ")}
    </Text>
  );
};
