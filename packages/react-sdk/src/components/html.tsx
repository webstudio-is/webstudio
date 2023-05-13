import { forwardRef, type ElementRef } from "react";

type Props = {
  code?: string;
};

export const Html = forwardRef<ElementRef<"div">, Props>((props, ref) => {
  const { code, ...rest } = props;
  return (
    <div
      {...rest}
      ref={ref}
      style={{ display: code?.trim().length !== 0 ? "contents" : "block" }}
      dangerouslySetInnerHTML={{ __html: code ?? "" }}
    />
  );
});

Html.displayName = "Html";
