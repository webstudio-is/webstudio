import { Link as BaseLink } from "@webstudio-is/sdk-components-react";
import { wrapLinkComponent } from "./shared/remix-link";

export const Link = wrapLinkComponent(BaseLink);
