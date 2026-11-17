import { type ReactNode, useSyncExternalStore } from "react";
import { LinkCurrentUrlContext } from "./link-current-url";

const subscribeToUrl = (listener: () => void) => {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
};

const getBrowserUrl = () => window.location.href;

export const BrowserCurrentUrlProvider = ({
  children,
  serverUrl,
}: {
  children: ReactNode;
  serverUrl: string;
}) => {
  const currentUrl = useSyncExternalStore(
    subscribeToUrl,
    getBrowserUrl,
    () => serverUrl
  );
  return (
    <LinkCurrentUrlContext.Provider value={currentUrl}>
      {children}
    </LinkCurrentUrlContext.Provider>
  );
};
