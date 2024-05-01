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
>(({ code, children, ...props }, ref) => {
  // We are supporting children here for historical reasons, because
  // the first version of this component allowed using any components inside the CodeText
  // and we didn't want to migrate them to use code, also it's not entirely possible.
  if (
    (children === undefined && code === undefined) ||
    String(code).trim().length === 0
  ) {
    return <Placeholder innerRef={ref} {...props} />;
  }
  return (
    <code {...props} ref={ref}>
      {code ?? children}
    </code>
  );
});

CodeText.displayName = "CodeText";
