import { LinkBlock as BaseLink } from "../../components/link-block";
import { wrapLinkComponent } from "./shared/remix-link";

export const LinkBlock = wrapLinkComponent(BaseLink);
