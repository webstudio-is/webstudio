import { type ElementRef, type ComponentProps, forwardRef } from "react";

export const defaultTag = "code";

type CodeTextProps = ComponentProps<typeof defaultTag> & {
  code?: string;
  language?: string;
  theme?: string;
};

export const CodeText = forwardRef<
  ElementRef<typeof defaultTag>,
  CodeTextProps
>(
  (
    {
      code,
      children,
      language: _language,
      theme: _theme,
      ...props
    }: CodeTextProps,
    ref
  ) => {
    // Children are supported for Code Text instances created before the
    // editable code property was introduced.
    if (
      (children === undefined && code === undefined) ||
      String(code).trim().length === 0
    ) {
      return (
        <code {...props} style={{ padding: 20 }} ref={ref}>
          {`Open the "Settings" panel to edit the code.`}
        </code>
      );
    }
    return (
      <code {...props} ref={ref}>
        {code ?? children}
      </code>
    );
  }
);

CodeText.displayName = "CodeText";
