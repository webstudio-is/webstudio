import {
  idAttribute,
  componentAttribute,
  ReactSdkContext,
} from "@webstudio-is/react-sdk";
import {
  Children,
  createElement,
  forwardRef,
  useContext,
  type ElementRef,
  type ReactNode,
} from "react";

export const defaultTag = "div";

// We don't want to enable all tags because Box is usually a container and we have specific components for many tags.
type Props = {
  tag: string;
  xmlns?: string;
  children: ReactNode;
  // xxxAttribute is used for typings only
  [idAttribute]: string;
  [componentAttribute]: string;
};

export const XmlNode = forwardRef<ElementRef<"div">, Props>(
  ({ tag = "", children, ...props }, ref) => {
    const { renderer } = useContext(ReactSdkContext);

    const attributeEntries = Object.entries(props)
      .filter(
        ([key]) =>
          key.startsWith("data-") === false && key.startsWith("aria-") === false
      )
      .filter(([key]) => key !== "tabIndex")
      .filter(([, value]) => typeof value !== "function");

    if (renderer === undefined) {
      const attrProps = Object.fromEntries(attributeEntries);
      return createElement(tag, attrProps, children);
    }

    const isTextChild = Children.toArray(children).every(
      (child) => typeof child === "string"
    );

    const elementName = tag
      // Must start from letter or underscore
      .replace(/^[^\p{L}_]+/u, "")
      // Clear all non letter, number, underscore, dot, and dash
      .replaceAll(/[^\p{L}\p{N}\-._]+/gu, "");

    const attributes = attributeEntries.map(
      ([key, value]) => `${key}=${JSON.stringify(value)}`
    );

    return (
      <div style={{ display: isTextChild ? "flex" : "contents" }} {...props}>
        <div style={{ color: "rgb(16, 23, 233)" }}>
          &lt;{[elementName, ...attributes].join(" ")}&gt;
        </div>
        <div ref={ref} style={{ marginLeft: isTextChild ? 0 : "1rem" }}>
          {children}
        </div>
        <div style={{ color: "rgb(16, 23, 233)" }}>&lt;/{elementName}&gt;</div>
      </div>
    );
  }
);

XmlNode.displayName = "XmlNode";
