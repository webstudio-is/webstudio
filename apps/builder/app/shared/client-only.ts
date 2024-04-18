import { type ReactNode, useSyncExternalStore } from "react";

export const ClientOnly = ({
  fallback,
  children,
}: {
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  // https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store
  const isServer = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true
  );
  if (isServer) {
    return fallback;
  }
  return children;
};
