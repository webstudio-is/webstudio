import { useEffect } from "react";
import * as plugins from "./plugins";

const initPlugins = () => {
  const cleanups: Array<() => void> = [];

  for (const plugin of Object.values(plugins)) {
    if (plugin.init) {
      cleanups.push(plugin.init());
    }
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
