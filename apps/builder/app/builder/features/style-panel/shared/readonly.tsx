import { createContext, useContext } from "react";

const ReadonlyContext = createContext(false);

export const ReadonlyProvider = ReadonlyContext.Provider;

export const useReadonly = () => useContext(ReadonlyContext);
