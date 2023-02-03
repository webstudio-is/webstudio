import type { WritableAtom } from "nanostores";
import { useSyncInitializeOnce } from "../hook-utils";
import { useSearchParams } from "@remix-run/react";
import { useEffect } from "react";

/**
 * One-way binding between the nanostore atom and the URLSearchParams object.
 * The initial value is read from the URLSearchParams object.
 * Then when we update the atom, we update the URLSearchParams object.
 *
 * Two-way binding is difficult to implement due to the asynchronous nature of URLSearchParams updates.
 * Remix dependent.
 **/
export const useSyncWithSearchParams = <T>(
  atom: WritableAtom<T>,
  getValue: (urlSearchParams: URLSearchParams) => T,
  setValue: (urlSearchParams: URLSearchParams, value: T) => void
) => {
  const [urlSearchParams, setURLSearchParams] = useSearchParams();
  useSyncInitializeOnce(() => {
    atom.set(getValue(urlSearchParams));
  });

  useEffect(() => {
    const unsubscribe = atom.listen((value) => {
      setURLSearchParams((params) => {
        const newUrlSearchParams = new URLSearchParams(params);
        setValue(newUrlSearchParams, value);
        return newUrlSearchParams;
      });
    });

    return unsubscribe;
  }, [atom, setURLSearchParams, setValue]);
};
