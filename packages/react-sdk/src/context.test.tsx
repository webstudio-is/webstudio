import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import { renderText } from "./context";

const renderTextBinding = (value: unknown) =>
  renderToStaticMarkup(<div>{renderText(value)}</div>);

test("failed resource status binding renders the status code", () => {
  const resource = {
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    data: { message: "Internal Server Error" },
  };
  const html = renderTextBinding(resource.status);

  expect(html).toBe("<div>500</div>");
});

test("application error field binding renders the error message", () => {
  const resource = {
    ok: true,
    status: 200,
    statusText: "OK",
    data: { error: "permission denied" },
  };
  const html = renderTextBinding(resource.data.error);

  expect(html).toBe("<div>permission denied</div>");
});

test("failed resource object binding renders empty text instead of crashing", () => {
  const resource = {
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    data: { message: "Internal Server Error" },
  };
  const html = renderTextBinding(resource);

  expect(html).toBe("<div></div>");
});

test("object-valued data binding renders empty text instead of crashing", () => {
  const resource = {
    data: { title: "Changed shape" },
    ok: true,
    status: 200,
    statusText: "OK",
  };
  const html = renderTextBinding(resource.data);

  expect(html).toBe("<div></div>");
});
