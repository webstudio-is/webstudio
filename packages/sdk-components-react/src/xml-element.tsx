import { componentAttribute } from "@webstudio-is/react-sdk";
import { Children, forwardRef, type ElementRef, type ReactNode } from "react";

export const defaultTag = "div";

// We don't want to enable all tags because Box is usually a container and we have specific components for many tags.
type Props = {
  tag: string;
  children: ReactNode;
} & Record<typeof componentAttribute, string>;

export const XmlElement = forwardRef<ElementRef<"div">, Props>(
  ({ tag = "element", children, ...props }, ref) => {
    const isTextChild = Children.toArray(children).every(
      (child) => typeof child === "string"
    );

    const elementName = tag.replaceAll(/[^\p{L}]+/gu, "");

    return (
      <div style={{ display: isTextChild ? "flex" : "contents" }} {...props}>
        <div style={{ color: "rgb(16, 23, 233)" }}>&lt;{elementName}&gt;</div>
        <div ref={ref} style={{ marginLeft: isTextChild ? 0 : "1rem" }}>
          {children}
        </div>
        <div style={{ color: "rgb(16, 23, 233)" }}>&lt;/{elementName}&gt;</div>
      </div>
    );
  }
);

XmlElement.displayName = "XmlElement";
