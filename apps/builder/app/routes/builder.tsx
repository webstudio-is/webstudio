import type { ServerRuntimeMetaFunction as MetaFunction } from "@remix-run/server-runtime";
import { Root } from "~/shared/remix";
import type { ShouldRevalidateFunction } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "Webstudio" }];
};

/**
 * We do not want trpc and other mutations that use the Remix useFetcher hook
 * to cause a reload of all builder data.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  return currentUrl.href === nextUrl.href ? false : defaultShouldRevalidate;
};

export default Root;
