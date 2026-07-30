import { forwardRef, useMemo, type ComponentProps } from "react";
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
  const html = useMemo(
    // support data uri protocol in images
    () => renderMarkdownHtml(code ?? ""),
    [code]
  );
  return <div {...rest} ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
});
