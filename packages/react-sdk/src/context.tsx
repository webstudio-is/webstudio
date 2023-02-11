import { type ReadableAtom, atom } from "nanostores";
import { createContext } from "react";
import type { Assets, PropsByInstanceId } from "./props";

export const ReactSdkContext = createContext<{
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
}>({
  propsByInstanceIdStore: atom(new Map()),
  assetsStore: atom(new Map()),
});
