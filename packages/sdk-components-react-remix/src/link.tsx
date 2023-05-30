import { Link as BaseLink } from "@webstudio-is/react-sdk";
import { wrapLinkComponent } from "./shared/remix-link";

export const Link = wrapLinkComponent(BaseLink);
