import { forwardRef, type ElementRef, type ComponentProps } from "react";

type Props = ComponentProps<"div"> & {
  html: string;
};

export const ContentEmbed = forwardRef<ElementRef<"div">, Props>(
  ({ children: _children, html, ...props }, ref) => (
    <div {...props} ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
  )
);

ContentEmbed.displayName = "ContentEmbed";
