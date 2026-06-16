import {
  Link as RemixLink,
  useLocation,
  useResolvedPath,
} from "@remix-run/react";
import { createLink } from "@webstudio-is/sdk-components-react";

export const Link = createLink({
  Link: RemixLink,
  useLocation,
  useResolvedPath,
});
