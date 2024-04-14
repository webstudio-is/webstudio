import { type ReactNode, useState, useEffect } from "react";

export const ClientOnly = ({ children }: { children: ReactNode }) => {
  const [rendered, setRendered] = useState(false);
  useEffect(() => setRendered(true), []);
  if (rendered) {
    return children;
  }
};
