/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import { test, expect, describe, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { __testing__, HtmlEmbed } from "./html-embed";
import { cartesian } from "./test-utils/cartesian";

const scriptTestIdPrefix = __testing__.scriptTestIdPrefix;
const SCRIPT_TEST_ID = "script-a";
const SCRIPT_PROCESSED_TEST_ID = `${scriptTestIdPrefix}${SCRIPT_TEST_ID}`;

const FRAGMENT_DIV_ID = "div";

const App = (props: {
  clientOnly?: boolean;
  renderer?: "canvas" | "preview";
  executeScriptOnCanvas?: boolean;
}) => {
  const [page, switchPage] = React.useReducer((n) => (n + 1) % 2, 0);
  const [refresh, setRefresh] = React.useReducer((n) => n + 1, 0);

  const code = `
    <script data-testid="${SCRIPT_TEST_ID}" data-page="${page}">console.log('hello')</script>
    <div data-testid="${FRAGMENT_DIV_ID}">hello</div>
  `;

  return (
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "",
        imageLoader: () => "",
        renderer: props.renderer,
        resources: {},
      }}
    >
      <div key={page}>
        <HtmlEmbed
          code={code}
          clientOnly={props.clientOnly}
          executeScriptOnCanvas={props.executeScriptOnCanvas}
        />
        <button type="button" onClick={switchPage}>
          page:{page}
        </button>
        <button type="button" onClick={setRefresh}>
          refresh:{refresh}
        </button>
      </div>
    </ReactSdkContext.Provider>
  );
};

beforeEach(() => {
  // clear body
  for (const child of document.body.children) {
    child.remove();
  }
});

describe("Published site", () => {
  /**
   * Tests the behavior of script tags in an SSR context for a published site with `clientOnly` set to false:
   * - SSR: Renders script tags in HTML embeds directly, without modification, on the server side, on hydration and on refresh.
   * - Page Navigation: Executes scripts using additional processing described here https://ghinda.net/article/script-tags/.
   */
  test.each([false, undefined])("clientOnly === false", async (clientOnly) => {
    const ui = <App clientOnly={clientOnly} />;
    const container = document.createElement("div");
    // Server rendering
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(ui);
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).toBeTruthy();
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

    // Hydration
    render(ui, { container, hydrate: true });
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).toBeTruthy();
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

    // Force page rerender
    fireEvent.click(screen.getByText("refresh:0"));
    expect(screen.getByText("refresh:1")).toBeTruthy();
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_TEST_ID)?.dataset.page).toEqual("0");
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

    // Force page change
    fireEvent.click(screen.getByText("page:0"));
    expect(screen.getByText("page:1")).toBeTruthy();
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).toBeTruthy();
    // Script has changed
    expect(
      screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)?.dataset.page
    ).toEqual("1");
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();
  });

  /**
   * Tests the behavior of script tags in an SSR context for a published site with `clientOnly` set to true:
   * - SSR: Do not render html embed at all on server side.
   * - Render HTMLEmbed atfer hydration, then executes scripts using additional processing described here https://ghinda.net/article/script-tags/.
   * - Page Navigation: Executes scripts using additional processing described here https://ghinda.net/article/script-tags/.
   */
  test("clientOnly === true", async () => {
    const ui = <App clientOnly={true} />;
    const container = document.createElement("div");
    // Server rendering
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(ui);
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).not.toBeTruthy();

    // Hydration
    render(ui, { container, hydrate: true });
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).toBeTruthy();
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

    // Force page rerender
    fireEvent.click(screen.getByText("refresh:0"));
    expect(screen.getByText("refresh:1")).toBeTruthy();
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).toBeTruthy();
    expect(
      screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)?.dataset.page
    ).toEqual("0");
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

    // Force page change
    fireEvent.click(screen.getByText("page:0"));
    expect(screen.getByText("page:1")).toBeTruthy;
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).toBeTruthy();
    expect(
      screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)?.dataset.page
    ).toEqual("1");
    expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();
  });
});

/**
 * On canvas renderer, scripts are not executed on the server side.
 */
describe("Builder renderer= canvas | preview", () => {
  /**
   * On canvas if renderer is canvas, and executeScriptOnCanvas=false
   * scripts postprocessing are not applied independently of clientOnly value.
   */
  test.each(
    cartesian(
      [true, false, undefined], //clientOnly
      [false, undefined] //executeScriptOnCanvas
    )
  )(
    "script processing are not applied when clientOnly=%p executeScriptOnCanvas=%p and renderer=canvas",
    async (clientOnly, executeScriptOnCanvas) => {
      const ui = (
        <App
          clientOnly={clientOnly}
          renderer={"canvas"}
          executeScriptOnCanvas={executeScriptOnCanvas}
        />
      );

      const container = document.createElement("div");
      // Server rendering
      document.body.appendChild(container);

      // Hydration
      render(ui, { container });
      // Wait execute await task(); to be executed (if exists)
      await Promise.resolve();

      expect(screen.queryByTestId(SCRIPT_TEST_ID)).toBeTruthy();
      expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).not.toBeTruthy();
      expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

      fireEvent.click(screen.getByText("refresh:0"));
      expect(screen.getByText("refresh:1")).toBeTruthy();
      // Wait execute await task(); to be executed (if exists)
      await Promise.resolve();

      expect(screen.queryByTestId(SCRIPT_TEST_ID)).toBeTruthy();
      expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).not.toBeTruthy();
      expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();
    }
  );

  /**
   * Script postprocessing is always applied for preview mode, independently of other props
   * Script postprocessing is always applied for canvas renderer if executeScriptOnCanvas = true or undefined
   */
  test.each([
    ...cartesian(
      [true, false, undefined], // clientOnly
      ["preview" as const], // renderer
      [true, false, undefined] // executeScriptOnCanvas
    ),
    ...cartesian(
      [true, false, undefined], // clientOnly
      ["canvas" as const], // renderer
      [true] // executeScriptOnCanvas
    ),
  ])(
    "In preview mode, script processing are applied when clientOnly=%p and renderer=%p and executeScriptOnCanvas=%p",
    async (clientOnly, renderer, executeScriptOnCanvas) => {
      const ui = (
        <App
          clientOnly={clientOnly}
          renderer={renderer}
          executeScriptOnCanvas={executeScriptOnCanvas}
        />
      );

      const container = document.createElement("div");
      // Server rendering
      document.body.appendChild(container);

      // Hydration
      render(ui, { container });
      // Wait execute await task(); to be executed (if exists)
      await Promise.resolve();

      expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
      expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).toBeTruthy();
      expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

      fireEvent.click(screen.getByText("refresh:0"));
      expect(screen.getByText("refresh:1")).toBeTruthy();
      // Wait execute await task(); to be executed (if exists)
      await Promise.resolve();

      expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
      expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).toBeTruthy();
      expect(screen.queryByTestId(FRAGMENT_DIV_ID)).toBeTruthy();

      document.body.removeChild(container);
    }
  );

  test("Code change cause scripts to be updated", async () => {
    const SCRIPT_TEST_ID_2 = "script-b";
    const SCRIPT_PROCESSED_TEST_ID_2 = `${scriptTestIdPrefix}${SCRIPT_TEST_ID_2}`;

    const codes = [
      `<script data-testid="${SCRIPT_TEST_ID}">console.log('hello')</script>`,
      `<script data-testid="${SCRIPT_TEST_ID_2}">console.log('hello')</script>`,
    ];

    const AppWithCode = () => {
      const [codeIndex, switchCodeIndex] = React.useReducer(
        (n) => (n + 1) % 2,
        0
      );

      const code = codes[codeIndex];

      return (
        <ReactSdkContext.Provider
          value={{
            assetBaseUrl: "",
            imageLoader: () => "",
            renderer: "canvas",
            resources: {},
          }}
        >
          <HtmlEmbed code={code} executeScriptOnCanvas={true} />
          <button type="button" onClick={switchCodeIndex}>
            code:{codeIndex}
          </button>
        </ReactSdkContext.Provider>
      );
    };

    const ui = <AppWithCode />;
    const container = document.createElement("div");
    // Server rendering
    document.body.appendChild(container);

    // Hydration
    render(ui, { container });
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();

    expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).toBeTruthy();

    // Force page rerender
    fireEvent.click(screen.getByText("code:0"));
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();

    expect(screen.queryByTestId(SCRIPT_TEST_ID)).not.toBeTruthy();
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID)).not.toBeTruthy();
    // Code has changed, new script processed
    expect(screen.queryByTestId(SCRIPT_PROCESSED_TEST_ID_2)).toBeTruthy();
  });

  test.each(["", "   "])("Placeholder is shown if code is %p", async (code) => {
    const AppWithCode = () => {
      return <HtmlEmbed code={code} executeScriptOnCanvas={true} />;
    };

    const ui = <AppWithCode />;
    const container = document.createElement("div");
    // Server rendering
    document.body.appendChild(container);

    // Hydration
    render(ui, { container });

    expect(
      screen.queryByText(`Open the "Settings" panel to insert HTML code.`)
    ).toBeTruthy();
  });
});
