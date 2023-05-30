import { LinkBlock as BaseLink } from "@webstudio-is/react-sdk";
import { wrapLinkComponent } from "./shared/remix-link";

export const LinkBlock = wrapLinkComponent(BaseLink);
