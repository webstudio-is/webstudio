import type { LoaderArgs, MetaFunction } from "@remix-run/node";
import { Root } from "~/shared/remix";
import env from "~/env/env.public.server";
import { getThemeData } from "~/shared/theme";
import type { ShouldRevalidateFunction } from "@remix-run/react";

export const loader = async ({ request }: LoaderArgs) => {
  return {
    env,
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio" };
};

/**
 * We do not want trpc and other mutations that use the Remix useFetcher hook
 * to cause a reload of all designer data.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  return currentUrl.href === nextUrl.href ? false : defaultShouldRevalidate;
};

export default Root;
