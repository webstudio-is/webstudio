import { useEffect } from "react";
import { initCopyPaste } from "./init-copy-paste";
import * as instance from "./plugin-instance";
import * as embedTemplate from "./plugin-embed-template";
import * as markdown from "./plugin-markdown";

export const useCopyPaste = () => {
  useEffect(() => {
    return initCopyPaste([instance, embedTemplate, markdown]);
  }, []);
};
