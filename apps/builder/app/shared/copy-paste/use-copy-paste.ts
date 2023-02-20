import { useEffect } from "react";
import { initCopyPaste } from "./init-copy-paste";
import * as plugins from "./plugins";

const initPlugins = () => {
  const cleanups: Array<() => void> = [];

  for (const plugin of Object.values(plugins)) {
    cleanups.push(initCopyPaste(plugin));
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
};

export const useCopyPaste = () => {
  useEffect(() => {
    return initPlugins();
  }, []);
};
