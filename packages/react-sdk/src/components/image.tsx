import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "img";

type ButtonProps = ComponentProps<typeof defaultTag>;

export const Image = forwardRef<ElementRef<typeof defaultTag>, ButtonProps>(
  (props, ref) => <img {...props} ref={ref} />
);

Image.defaultProps = {
  src: "placeholder.webp", // Match the platform default
};
Image.displayName = "Image";
