import { forwardRef } from "react";
import {
  type RichTextLinkProps,
  type RichTextLinkRef,
  RichTextLink,
} from "../../components/rich-text-link";
import { renderRemixLink } from "./shared/remix-link";

export const Component = forwardRef<RichTextLinkRef, RichTextLinkProps>(
  ({ href = "", ...props }, ref) => renderRemixLink(href, props, ref)
);

Component.displayName = RichTextLink.displayName;
