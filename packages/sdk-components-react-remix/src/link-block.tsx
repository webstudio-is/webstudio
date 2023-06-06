import { LinkBlock as BaseLink } from "@webstudio-is/sdk-components-react";
import { wrapLinkComponent } from "./shared/remix-link";

export const LinkBlock = wrapLinkComponent(BaseLink);
