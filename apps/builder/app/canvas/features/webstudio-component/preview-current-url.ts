export const getPreviewCurrentUrl = (
  currentSystem: {
    pathname: string;
    search: Record<string, string | undefined>;
    searchAll?: Record<string, string[]>;
  },
  hash: string
) => {
  // Preview renders inside the builder canvas route, so window.location points
  // at the builder shell, not the page being previewed. Recreate the page URL
  // from the selected page system data so :local-link state matches preview
  // navigation, including query params and hash-only links.
  const currentUrl = new URL(currentSystem.pathname, "https://webstudio.local");
  const searchParams = new URLSearchParams();
  if (currentSystem.searchAll !== undefined) {
    for (const [name, values] of Object.entries(currentSystem.searchAll)) {
      for (const value of values) {
        searchParams.append(name, value);
      }
    }
  } else {
    for (const [name, value] of Object.entries(currentSystem.search)) {
      if (value !== undefined) {
        searchParams.append(name, value);
      }
    }
  }
  currentUrl.search = searchParams.toString();
  currentUrl.hash = hash;
  return currentUrl;
};
