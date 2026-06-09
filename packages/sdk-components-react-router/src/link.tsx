import { Link as RemixLink, useLocation, useResolvedPath } from "react-router";
import { createLocalLink } from "@webstudio-is/sdk-components-react/local-link";

export const Link = createLocalLink({
  Link: RemixLink,
  useLocation,
  useResolvedPath,
});
