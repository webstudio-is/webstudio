import { Shortcut } from "./shortcut";

export default {
  title: "Library/Shortcut",
};

const ShortcutStory = () => <Shortcut value={["cmd", "z"]} />;

export { ShortcutStory as Shortcut };
