import { atom, type WritableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { type Instance } from "@webstudio-is/react-sdk";

const useValue = <T>(atom: WritableAtom<T>) => {
  const value = useStore(atom);
  return [value, atom.set] as const;
};

export const selectedInstanceContainer = atom<Instance | undefined>();
export const useSelectedInstance = () => useValue(selectedInstanceContainer);
