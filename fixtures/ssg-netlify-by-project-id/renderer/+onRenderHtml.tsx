import { renderToString } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlSync } from "vike/types";
// @todo think about how to make __generated__ typeable
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { CustomCode } from "../app/__generated__/_index";

export const onRenderHtml: OnRenderHtmlSync = (pageContext) => {
  const lang = pageContext.data.pageMeta.language || "en";
  const Head = pageContext.config.Head ?? (() => <></>);
  const Page = pageContext.Page ?? (() => <></>);
  const html = dangerouslySkipEscape(
    renderToString(
      <html lang={lang}>
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <Head data={pageContext.data} />
          <CustomCode />
        </head>
        <Page data={pageContext.data} />
      </html>
    )
  );
  return escapeInject`<!DOCTYPE html>
${html}
`;
};
