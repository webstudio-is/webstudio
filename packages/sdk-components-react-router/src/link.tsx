import { Link as RouterLink, useLocation, useResolvedPath } from "react-router";
import { createLink } from "@webstudio-is/sdk-components-react";

export const Link = createLink({
  Link: RouterLink,
  useLocation,
  useResolvedPath,
});
