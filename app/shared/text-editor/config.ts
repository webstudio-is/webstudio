import { EmojiNode } from "./nodes/emoji-node";
import { darkTheme } from "./themes/dark";

export const config = {
  theme: darkTheme,
  onError(error) {
    throw error;
  },
  nodes: [EmojiNode],
};
