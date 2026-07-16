import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  escapeJsonLdScriptText,
  validateJsonLd,
} from "@webstudio-is/sdk/runtime";
import {
  forwardRef,
  type ElementRef,
  type Ref,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { HeadSlotContext } from "./head-slot-context";
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
    const isInHeadSlot = useContext(HeadSlotContext);
    const [isMounted, setIsMounted] = useState(false);
    const serialized = serializeJsonLd(code);

    useEffect(() => {
      if (isInHeadSlot) {
        setIsMounted(true);
      }
    }, [isInHeadSlot]);

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

    const script = (
      <script
        ref={ref}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );

    if (isInHeadSlot && isMounted) {
      return createPortal(script, document.head);
    }

    return script;
  }
);

JsonLd.displayName = "JsonLd";
