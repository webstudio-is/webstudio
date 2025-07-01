import { nanoid } from "nanoid";
import {
  initialBreakpoints,
  type Pages,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { coreTemplates } from "@webstudio-is/sdk/core-templates";
import { css, renderData, ws } from "@webstudio-is/template";
import { createRootFolder } from "./shared/pages-utils";

export const createPages = (): WebstudioData => {
  const breakpoints = initialBreakpoints.map((breakpoint) => ({
    ...breakpoint,
    id: nanoid(),
  }));
  const homePageId = nanoid();
  const homeBodyId = nanoid();
  const notFoundPageId = nanoid();
  const notFoundBodyId = nanoid();

  const data = renderData(
    <>
      {/* home page body */}
      <ws.element ws:tag="body" ws:id={homeBodyId}></ws.element>
      {/* not found page body */}
      <ws.element
        ws:tag="body"
        ws:id={notFoundBodyId}
        ws:style={css`
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #fff;
        `}
      >
        <ws.element ws:tag="div">
          <ws.element
            ws:tag="div"
            ws:style={css`
              position: relative;
              text-align: center;
              font-weight: 900;
              font-size: 8rem;
              line-height: 1;
              letter-spacing: -0.05em;
            `}
          >
            <ws.element ws:tag="div">404</ws.element>
            <ws.element
              ws:tag="div"
              ws:style={css`
                position: absolute;
                inset: 0 -0.125rem 0 0.125rem;
                opacity: 0.3;
              `}
            >
              404
            </ws.element>
            <ws.element
              ws:tag="div"
              ws:style={css`
                position: absolute;
                inset: 0 0.125rem 0 -0.125rem;
                opacity: 0.3;
              `}
            >
              404
            </ws.element>
            <ws.element
              ws:tag="div"
              ws:style={css`
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                background-color: #fff;
                height: 0.375rem;
              `}
            ></ws.element>
          </ws.element>
          <ws.element
            ws:tag="p"
            ws:style={css`
              margin-top: 1.5rem;
              font-weight: 700;
              font-size: 1.5rem;
              line-height: 2rem;
              letter-spacing: 0.05em;
            `}
          >
            PAGE NOT FOUND
          </ws.element>
        </ws.element>
        {coreTemplates.builtWithWebstudio.template}
      </ws.element>
    </>,
    nanoid,
    breakpoints
  );

  const pages: Pages = {
    homePage: {
      id: homePageId,
      name: "Home",
      path: "",
      title: `"Home"`,
      meta: {},
      rootInstanceId: homeBodyId,
    },
    pages: [
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
    folders: [createRootFolder([homePageId, notFoundPageId])],
  };

  return { ...data, pages };
};

createPages();
