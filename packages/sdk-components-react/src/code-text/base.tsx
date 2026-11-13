import { type ElementRef, type ComponentProps, forwardRef } from "react";

export const defaultTag = "code";

type CodeTextProps = ComponentProps<typeof defaultTag> & {
  /** @deprecated Use children (Text Content) instead. */
  code?: string;
  language?: string;
  theme?: string;
  "data-ws-text-editing"?: string;
};

export const CodeText = forwardRef<
  ElementRef<typeof defaultTag>,
  CodeTextProps
>(
  (
    {
      code: legacyCode,
      children,
      language: _language,
      theme: _theme,
      ...props
    }: CodeTextProps,
    ref
  ) => {
    return (
      <code {...props} ref={ref}>
        {children ?? legacyCode}
      </code>
    );
  }
);

CodeText.displayName = "CodeText";
