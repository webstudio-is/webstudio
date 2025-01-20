import {
  ReactSdkContext,
  xmlNodeTagSuffix,
} from "@webstudio-is/react-sdk/runtime";
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
  children?: ReactNode;
  rel?: string;
  hreflang?: string;
  href?: string;
  "xmlns:xhtml"?: string;
};

export const XmlNode = forwardRef<ElementRef<"div">, Props>(
  ({ tag = "", children, ...props }, ref) => {
    const { renderer } = useContext(ReactSdkContext);

    const attributeEntries = Object.entries(props)
      .filter(
        ([key]) =>
          key.startsWith("data-") === false && key.startsWith("aria-") === false
      )
      .filter(([key]) => key.toLowerCase() !== "tabindex")
      .filter(([, value]) => typeof value !== "function");

    const elementName = tag
      // Must start from letter or underscore
      .replace(/^[^\p{L}_]+/u, "")
      // Clear all non letter, number, underscore, dot, and dash
      .replaceAll(/[^\p{L}\p{N}\-._:]+/gu, "")
      .trim();

    if (renderer === undefined) {
      const attrProps = Object.fromEntries(attributeEntries);
      return createElement(
        `${elementName}${xmlNodeTagSuffix}`,
        attrProps,
        children
      );
    }

    const childrenArray = Children.toArray(children);
    const isTextChild =
      childrenArray.length > 0 &&
      childrenArray.every((child) => typeof child === "string");

    const renderAttributes = (attrs: [string, string][]) => {
      return attrs.map(([name, value], index) => {
        return (
          <span key={index}>
            {" "}
            <span style={{ color: "#FF0000" }}>{name}</span>
            <span style={{ color: "#000000" }}>=</span>
            <span style={{ color: "#0000FF" }}>"{value}"</span>
          </span>
        );
      });
    };

    return (
      <div {...props}>
        <span>
          <span style={{ color: "#800000" }}>&lt;{elementName}</span>
          {attributeEntries.length > 0 && renderAttributes(attributeEntries)}
          {childrenArray.length === 0 ? (
            <span style={{ color: "#800000" }}>/&gt;</span>
          ) : (
            <span style={{ color: "#800000" }}>&gt;</span>
          )}
        </span>
        {childrenArray.length > 0 && (
          <>
            <div
              ref={ref}
              style={{
                display: isTextChild ? "inline" : "block",
                marginLeft: isTextChild ? 0 : "1rem",
              }}
            >
              {children}
            </div>
            <span style={{ color: "#800000" }}>&lt;/{elementName}&gt;</span>
          </>
        )}
      </div>
    );
  }
);

XmlNode.displayName = "XmlNode";
