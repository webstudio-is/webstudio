import { type ReadableAtom, atom } from "nanostores";
import { createContext } from "react";
import type { Assets } from "@webstudio-is/asset-uploader";
import type { Pages, PropsByInstanceId } from "./props";

export const ReactSdkContext = createContext<{
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
  pagesStore: ReadableAtom<Pages>;
}>({
  propsByInstanceIdStore: atom(new Map()),
  assetsStore: atom(new Map()),
  pagesStore: atom(new Map()),
});
