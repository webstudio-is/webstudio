export const buildSitesStorageKey = (
  projectDomain: string,
  pathname: string | null
) => {
  if (pathname === "/" || pathname == null) {
    pathname = "-home";
  }
  pathname = pathname.replaceAll("/", "-");
  return `${projectDomain}${pathname}`;
};
