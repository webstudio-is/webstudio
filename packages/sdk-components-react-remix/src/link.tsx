import {
  Link as RemixLink,
  useLocation,
  useResolvedPath,
} from "@remix-run/react";
import { createLocalLink } from "@webstudio-is/sdk-components-react";

export const Link = createLocalLink({
  Link: RemixLink,
  useLocation,
  useResolvedPath,
});
