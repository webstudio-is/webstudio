import { type Root, createRoot } from "react-dom/client";
import type { OnRenderClientSync } from "vike/types";
// @todo think about how to make __generated__ typeable
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { CustomCode } from "../app/__generated__/_index";

let root: Root;

export const onRenderClient: OnRenderClientSync = (pageContext) => {
  const lang = pageContext.data.pageMeta.language || "en";
  const Head = pageContext.config.Head ?? (() => <></>);
  const Page = pageContext.Page ?? (() => <></>);
  const htmlContent = (
    <>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Head data={pageContext.data} />
        <CustomCode />
      </head>
      <Page data={pageContext.data} />
    </>
  );
  if (root === undefined) {
    root = createRoot(document.documentElement);
  }
  document.documentElement.lang = lang;
  root.render(htmlContent);
};
