import { Text } from "./text";

const isMac =
  typeof navigator === "object" ? /mac/i.test(navigator.platform) : false;

const shortcutSymbolMap: Record<string, string> = {
  cmd: isMac ? "⌘" : "Ctrl",
  shift: "⇧",
  alt: isMac ? "⌥" : "Alt",
  backspace: "⌫",
  enter: "↵",
  tab: isMac ? "tab" : "Tab",
  click: isMac ? "+click" : "+ Click",
  "click[0]": isMac ? "click" : "Click",
};

type ShortcutDefinition = ReadonlyArray<string>;

const format = (value: ShortcutDefinition) => {
  return value.map(
    (shortcut, index) =>
      shortcutSymbolMap[`${shortcut}[${index}]`] ??
      shortcutSymbolMap[shortcut] ??
      shortcut.toUpperCase()
  );
};

export const Kbd = ({
  value,
  color = "subtle",
  variant,
}: {
  value: ShortcutDefinition;
  color?: "subtle" | "moreSubtle" | "contrast";
  variant?: "regular";
}) => {
  return (
    <Text color={color} variant={variant} as="kbd">
      {format(value).join(isMac ? "" : " ")}
    </Text>
  );
};
