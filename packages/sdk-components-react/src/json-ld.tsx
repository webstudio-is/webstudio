import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  escapeJsonLdScriptText,
  validateJsonLd,
} from "@webstudio-is/sdk/runtime";
import { forwardRef, type ElementRef, useContext } from "react";

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
