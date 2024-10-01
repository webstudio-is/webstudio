import { initPlugins } from "./init-plugins";
import * as instance from "./plugin-instance";
import * as embedTemplate from "./plugin-embed-template";
import * as markdown from "./plugin-markdown";
import * as webflow from "./plugin-webflow/plugin-webflow";

export const initCopyPaste = ({ signal }: { signal: AbortSignal }) => {
  initPlugins({
    plugins: [instance, embedTemplate, markdown, webflow],
    signal,
  });
};
