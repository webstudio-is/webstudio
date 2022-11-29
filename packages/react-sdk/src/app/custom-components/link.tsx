import { Link as BaseLink } from "../../components/link";
import { wrapLinkComponent } from "./shared/remix-link";

export const Link = wrapLinkComponent(BaseLink);
