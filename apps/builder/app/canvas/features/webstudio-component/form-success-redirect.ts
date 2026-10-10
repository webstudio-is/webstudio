/** Navigate in the current frame so async Form submissions are never popup-blocked. */
export const navigatePreviewFormSuccess = (
  destination: string,
  currentHref: string,
  navigateInternal: (path: string) => boolean,
  navigateExternal: (href: string) => void
) => {
  const current = new URL(currentHref);
  const target = new URL(destination, current);
  if (target.origin === current.origin) {
    return navigateInternal(target.pathname + target.search + target.hash);
  }
  navigateExternal(target.href);
  return true;
};
