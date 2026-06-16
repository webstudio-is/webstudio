import { createContext } from "react";

export const LinkCurrentUrlContext = createContext<string | URL | undefined>(
  undefined
);
