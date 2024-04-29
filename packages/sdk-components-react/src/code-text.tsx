import {
  type ElementRef,
  type ComponentProps,
  forwardRef,
  type ForwardedRef,
} from "react";

export const defaultTag = "code";

const Placeholder = ({
  innerRef,
  ...rest
}: {
  innerRef: ForwardedRef<HTMLElement>;
}) => {
  return (
    <code {...rest} style={{ padding: 20 }} ref={innerRef}>
      {`Open the "Settings" panel to edit the code.`}
    </code>
  );
};

export const CodeText = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & { code?: string }
>(({ code, ...props }, ref) => {
  if (code === undefined || String(code).trim().length === 0) {
    return <Placeholder innerRef={ref} {...props} />;
  }
  return (
    <code {...props} ref={ref}>
      {code}
    </code>
  );
});

CodeText.displayName = "CodeText";
