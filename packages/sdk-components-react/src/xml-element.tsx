import { componentAttribute } from "@webstudio-is/react-sdk";
import { Children, forwardRef, type ElementRef, type ReactNode } from "react";

export const defaultTag = "div";

// We don't want to enable all tags because Box is usually a container and we have specific components for many tags.
type Props = {
  name: string;
  className: string;
  children: ReactNode;
} & Record<typeof componentAttribute, string>;

export const XmlElement = forwardRef<ElementRef<"ul">, Props>(
  (
    {
      name = "element",
      [componentAttribute]: attrValue,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isTextChild = Children.toArray(children).every(
      (child) => typeof child === "string"
    );

    const elementName = name.replaceAll(/[^\p{L}]+/gu, "");

    return (
      <div style={{ display: isTextChild ? "flex" : "contents" }} {...props}>
        <div {...{ [componentAttribute]: attrValue }}>
          &lt;{elementName}&gt;
        </div>
        {isTextChild ? (
          <span
            ref={ref}
            data-ws-xml-element-name={name}
            {...{ [componentAttribute]: attrValue }}
          >
            {children}
          </span>
        ) : (
          <ul
            ref={ref}
            data-ws-xml-element-name={name}
            {...{ [componentAttribute]: attrValue }}
          >
            {children}
          </ul>
        )}
        <div {...{ [componentAttribute]: attrValue }}>
          &lt;/{elementName}&gt;
        </div>
      </div>
    );
  }
);

XmlElement.displayName = "XmlElement";
