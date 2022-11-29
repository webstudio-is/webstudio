import { forwardRef } from "react";
import { type LinkProps, type LinkRef, Link } from "../../components/link";
import { renderRemixLink } from "./shared/remix-link";

export const Component = forwardRef<LinkRef, LinkProps>(
  ({ href = "", ...props }, ref) => renderRemixLink(href, props, ref)
);

Component.displayName = Link.displayName;
