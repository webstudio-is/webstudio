/**
 * @jest-environment jsdom
 */
import * as React from "react";
// import ReactDOM from "react-dom";
import ReactDOMServer from "react-dom/server";
import { test, expect, describe } from "@jest/globals";
// eslint-disable-next-line import/no-internal-modules
import "@testing-library/jest-dom/jest-globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { CLIENT_TEST_ID_PREFIX, HtmlEmbed } from "./html-embed";

global.React = React;

const SCRIPT_SERVER_TEST_ID = "script-a";
const SCRIPT_CLIENT_TEST_ID = `${CLIENT_TEST_ID_PREFIX}${SCRIPT_SERVER_TEST_ID}`;

const App = (props: { clientOnly: boolean }) => {
  const [page, switchPage] = React.useReducer((n) => (n + 1) % 2, 0);
  const [refresh, setRefresh] = React.useReducer((n) => n + 1, 0);

  const code = `<script data-testid="${SCRIPT_SERVER_TEST_ID}" data-page="${page}">console.log('hello')</script>`;

  return (
    <div key={page}>
      <HtmlEmbed code={code} clientOnly={props.clientOnly} />
      <button type="button" onClick={switchPage}>
        page:{page}
      </button>
      <button type="button" onClick={setRefresh}>
        refresh:{refresh}
      </button>
    </div>
  );
};

describe("Published site", () => {
  /**
   * Tests the behavior of script tags in an SSR context for a published site with `clientOnly` set to false:
   * - SSR: Renders script tags in HTML embeds directly, without modification, on the server side, on hydration and on refresh.
   * - Page Navigation: Executes scripts using additional processing described here https://ghinda.net/article/script-tags/.
   */
  test("clientOnly === false", async () => {
    const ui = <App clientOnly={false} />;
    const container = document.createElement("div");
    // Server rendering
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(ui);
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).toBeInTheDocument();

    // Hydration
    render(ui, { container, hydrate: true });
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).toBeInTheDocument();

    // Force page rerender
    fireEvent.click(screen.getByText("refresh:0"));
    expect(screen.getByText("refresh:1")).toBeInTheDocument();
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)?.dataset.page).toEqual(
      "0"
    );

    // Force page change
    fireEvent.click(screen.getByText("page:0"));
    expect(screen.getByText("page:1")).toBeTruthy();
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)).toBeInTheDocument();
    // Script has changed
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)?.dataset.page).toEqual(
      "1"
    );
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
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)).not.toBeInTheDocument();

    // Hydration
    render(ui, { container, hydrate: true });
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)).toBeInTheDocument();

    // Force page rerender
    fireEvent.click(screen.getByText("refresh:0"));
    expect(screen.getByText("refresh:1")).toBeInTheDocument();
    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)?.dataset.page).toEqual(
      "0"
    );

    // Force page change
    fireEvent.click(screen.getByText("page:0"));
    expect(screen.getByText("page:1")).toBeTruthy();

    // Wait execute await task(); to be executed (if exists)
    await Promise.resolve();
    expect(screen.queryByTestId(SCRIPT_SERVER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(SCRIPT_CLIENT_TEST_ID)?.dataset.page).toEqual(
      "1"
    );
  });
});
