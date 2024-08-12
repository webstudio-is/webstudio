import { createJsonStringifyProxy, isPlainObject } from "@webstudio-is/sdk";
import { useState, useMemo, type Dispatch, type SetStateAction } from "react";

export const useVariableState = <S,>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>] => {
  const [state, setState] = useState(initialState);

  const value = useMemo(
    () => (isPlainObject(state) ? createJsonStringifyProxy(state) : state),
    [state]
  );

  return [value, setState];
};
