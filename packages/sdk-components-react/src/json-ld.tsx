import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  escapeJsonLdScriptText,
  validateJsonLd,
} from "@webstudio-is/sdk/runtime";
import { forwardRef, type ElementRef, type Ref, useContext } from "react";
import { XmlNode } from "./xml-node";

export const defaultTag = "script";

const serializeJsonLd = (code: unknown) => {
  const result = validateJsonLd(code);
  if (result.success === false) {
    return;
  }
  return escapeJsonLdScriptText(JSON.stringify(result.value));
};

export const JsonLd = forwardRef<ElementRef<"script">, { code?: unknown }>(
  ({ code = "" }, ref) => {
    const { renderer } = useContext(ReactSdkContext);
    const serialized = serializeJsonLd(code);

    if (renderer === "canvas") {
      return (
        <XmlNode
          tag={defaultTag}
          {...{ type: "application/ld+json" }}
          ref={ref as Ref<HTMLDivElement>}
        >
          {serialized ?? "JSON-LD value is unavailable or invalid."}
        </XmlNode>
      );
    }

    const content =
      renderer === undefined
        ? serialized
        : (serialized ??
          (typeof code === "string"
            ? escapeJsonLdScriptText(code)
            : undefined));
    if (content === undefined) {
      return null;
    }

    return (
      <script
        ref={ref}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
);

JsonLd.displayName = "JsonLd";
