import { forwardRef, useContext, useMemo, type ComponentProps } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { renderMarkdownHtml } from "./markdown";

type MarkdownEmbedProps = ComponentProps<"div"> & {
  code: string;
  // avoid builder passing it to dom
  children?: never;
};

export const MarkdownEmbed = /* @__PURE__ */ forwardRef<
  HTMLDivElement,
  MarkdownEmbedProps
>((props, ref) => {
  const { code, children, ...rest } = props;
  const { imageLoader, renderer } = useContext(ReactSdkContext);
  const html = useMemo(
    // support data uri protocol in images
    () => renderMarkdownHtml(code ?? "", { imageLoader, renderer }),
    [code, imageLoader, renderer]
  );
  return <div {...rest} ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
});
