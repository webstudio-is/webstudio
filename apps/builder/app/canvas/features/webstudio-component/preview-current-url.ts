import { appendSystemSearch, type System } from "@webstudio-is/sdk";

export const getPreviewCurrentUrl = (
  currentSystem: Pick<System, "pathname" | "search">,
  hash: string
) => {
  // Preview renders inside the builder canvas route, so window.location points
  // at the builder shell, not the page being previewed. Recreate the page URL
  // from the selected page system data so :local-link state matches preview
  // navigation, including query params and hash-only links.
  const currentUrl = new URL(currentSystem.pathname, "https://webstudio.local");
  const searchParams = new URLSearchParams();
  appendSystemSearch(searchParams, currentSystem.search);
  currentUrl.search = searchParams.toString();
  currentUrl.hash = hash;
  return currentUrl;
};
