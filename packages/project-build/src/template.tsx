import {
  createId,
  initialBreakpoints,
  type Pages,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { coreTemplates } from "@webstudio-is/sdk-components-registry/core-templates";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import { css, renderData } from "@webstudio-is/template";
import { createRootFolder } from "./shared/pages-utils";

export const createPages = (): WebstudioData => {
  const breakpoints = initialBreakpoints.map((breakpoint) => ({
    ...breakpoint,
    id: createId("nano"),
  }));
  const homePageId = createId("nano");
  const homeBodyId = createId("nano");
  const notFoundPageId = createId("nano");
  const notFoundBodyId = createId("nano");

  const data = renderData(
    <>
      {/* home page body */}
      <body ws:id={homeBodyId} />
      {/* not found page body */}
      <body
        ws:id={notFoundBodyId}
        ws:style={css`
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #fff;
        `}
      >
        <div>
          <div
            ws:style={css`
              position: relative;
              text-align: center;
              font-weight: 900;
              font-size: 8rem;
              line-height: 1;
              letter-spacing: -0.05em;
            `}
          >
            <div>404</div>
            <div
              ws:style={css`
                position: absolute;
                inset: 0 -0.125rem 0 0.125rem;
                opacity: 0.3;
              `}
            >
              404
            </div>
            <div
              ws:style={css`
                position: absolute;
                inset: 0 0.125rem 0 -0.125rem;
                opacity: 0.3;
              `}
            >
              404
            </div>
            <div
              ws:style={css`
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                background-color: #fff;
                height: 0.375rem;
              `}
            />
          </div>
          <p
            ws:style={css`
              margin-top: 1.5rem;
              font-weight: 700;
              font-size: 1.5rem;
              line-height: 2rem;
              letter-spacing: 0.05em;
            `}
          >
            PAGE NOT FOUND
          </p>
        </div>
        {coreTemplates.builtWithWebstudio.template}
      </body>
    </>,
    () => createId("nano"),
    breakpoints,
    { componentIds }
  );

  const pages: Pages = {
    homePageId,
    rootFolderId: "root",
    pages: new Map([
      [
        homePageId,
        {
          id: homePageId,
          name: "Home",
          path: "",
          title: `"Home"`,
          meta: {},
          rootInstanceId: homeBodyId,
        },
      ],
      [
        notFoundPageId,
        {
          id: notFoundPageId,
          name: "404",
          path: "/*",
          title: `"Page not found"`,
          meta: {
            status: `404`,
            excludePageFromSearch: "false",
          },
          rootInstanceId: notFoundBodyId,
        },
      ],
    ]),
    folders: new Map([
      ["root", createRootFolder([homePageId, notFoundPageId])],
    ]),
  };

  return { ...data, pages };
};

createPages();
