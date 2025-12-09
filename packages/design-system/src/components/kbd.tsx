import { Text } from "./text";

const isMac =
  typeof navigator === "object" ? /mac/i.test(navigator.platform) : false;

const shortcutSymbolMap: Record<string, string> = {
  meta: isMac ? "⌘" : "Ctrl",
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

/**
 * Filter hotkeys array to show only the appropriate one for current OS.
 * Prioritizes meta (Mac) or ctrl (Windows/Linux) hotkeys.
 */
export const filterHotkeyByOs = (hotkeys: readonly string[]): string => {
  if (hotkeys.length === 1) {
    return hotkeys[0];
  }

  const macHotkey = hotkeys.find((key) => key.includes("meta"));
  const winHotkey = hotkeys.find((key) => key.includes("ctrl"));

  if (isMac && macHotkey) {
    return macHotkey;
  }
  if (!isMac && winHotkey) {
    return winHotkey;
  }

  return hotkeys[0];
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
