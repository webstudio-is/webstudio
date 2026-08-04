import { renderToReadableStream } from "react-dom/server.browser";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlAsync } from "vike/types";
import {
  CustomCode,
  projectId,
  projectVersion,
  lastPublished,
  // @todo think about how to make __generated__ typeable
  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  // @ts-ignore
} from "../app/__generated__/_index";

export const onRenderHtml: OnRenderHtmlAsync = async (pageContext) => {
  const lang = pageContext.data.pageMeta.language || "en";
  const Head = pageContext.config.Head ?? (() => <></>);
  const Page = pageContext.Page ?? (() => <></>);
  const stream = await renderToReadableStream(
    <html
      lang={lang}
      data-ws-project={projectId}
      data-ws-version={projectVersion}
      data-ws-last-published={lastPublished}
    >
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Head data={pageContext.data} />
        <CustomCode />
      </head>
      <Page data={pageContext.data} />
    </html>
  );
  await stream.allReady;
  const html = dangerouslySkipEscape(await new Response(stream).text());
  return escapeInject`${html}`;
};
