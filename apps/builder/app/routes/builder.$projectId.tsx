import { useLoaderData, type ShouldRevalidateFunction } from "@remix-run/react";
import { type BuilderProps, Builder, links } from "~/builder";

export * from "./_builder-shared";

export { links };

/**
 * We do not want trpc and other mutations that use the Remix useFetcher hook
 * to cause a reload of all builder data.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  const currentUrlCopy = new URL(currentUrl);
  const nextUrlCopy = new URL(nextUrl);
  // prevent revalidating data when pageId changes
  // to not regenerate auth token and preserve canvas url
  currentUrlCopy.searchParams.delete("pageId");
  nextUrlCopy.searchParams.delete("pageId");

  currentUrlCopy.searchParams.delete("mode");
  nextUrlCopy.searchParams.delete("mode");

  currentUrlCopy.searchParams.delete("pageHash");
  nextUrlCopy.searchParams.delete("pageHash");

  return currentUrlCopy.href === nextUrlCopy.href
    ? false
    : defaultShouldRevalidate;
};

const BuilderRoute = () => {
  const data = useLoaderData<BuilderProps>();

  return <Builder {...data} />;
};

export default BuilderRoute;
