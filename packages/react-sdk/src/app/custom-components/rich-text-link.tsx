import { RichTextLink as BaseLink } from "../../components/rich-text-link";
import { wrapLinkComponent } from "./shared/remix-link";

export const RichTextLink = wrapLinkComponent(BaseLink);
