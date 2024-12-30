import { micromark } from "micromark";
import { gfmTable, gfmTableHtml } from "micromark-extension-gfm-table";
import { forwardRef, useMemo } from "react";

type MarkdownEmbedProps = {
  code: string;
  className?: string;
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
    () =>
      micromark(code ?? "", {
        allowDangerousProtocol: true,
        extensions: [gfmTable()],
        htmlExtensions: [gfmTableHtml()],
      }),
    [code]
  );
  return <div {...rest} ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
});
