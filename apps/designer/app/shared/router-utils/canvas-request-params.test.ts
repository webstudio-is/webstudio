import { getCanvasRequestParams } from "./canvas-request-params";

const makeRequest = (url: string, headers: { [key: string]: string }) => ({
  url,
  headers: {
    get: (name: string) => (headers[name] === undefined ? null : headers[name]),
  },
});

describe("getCanvasRequestParams", () => {
  test("returns undefined if the request is not an canvas request", () => {
    expect(
      getCanvasRequestParams(makeRequest("https://example.com", {}))
    ).toBeUndefined();
  });

  test("detects project domain on localhost via `x-forwarded-host` header", () => {
    expect(
      getCanvasRequestParams(
        makeRequest("https://foo.localhost", {
          "x-forwarded-host": "foo.localhost",
        })
      )
    ).toMatchInlineSnapshot(`
      Object {
        "mode": "published",
        "pathname": "/",
        "projectDomain": "foo",
      }
    `);
  });

  test("detects project domain on localhost via `host` header", () => {
    expect(
      getCanvasRequestParams(
        makeRequest("https://foo.localhost", { host: "foo.localhost" })
      )
    ).toMatchInlineSnapshot(`
      Object {
        "mode": "published",
        "pathname": "/",
        "projectDomain": "foo",
      }
    `);
  });

  test("detects projectId parameter", () => {
    expect(
      getCanvasRequestParams(
        makeRequest("https://foo.localhost?projectId=bar", {})
      )
    ).toMatchInlineSnapshot(`
      Object {
        "mode": "published",
        "pathname": "/",
        "projectId": "bar",
      }
    `);
  });

  test("detects path", () => {
    expect(
      getCanvasRequestParams(
        makeRequest("https://foo.localhost/some/path?projectId=bar", {})
      )?.pathname
    ).toMatchInlineSnapshot(`"/some/path"`);
  });

  test("detects mode", () => {
    expect(
      getCanvasRequestParams(
        makeRequest(
          "https://foo.localhost/some/path?projectId=bar&mode=edit",
          {}
        )
      )?.mode
    ).toMatchInlineSnapshot(`"edit"`);

    expect(
      getCanvasRequestParams(
        makeRequest(
          "https://foo.localhost/some/path?projectId=bar&mode=preview",
          {}
        )
      )?.mode
    ).toMatchInlineSnapshot(`"preview"`);

    expect(
      getCanvasRequestParams(
        makeRequest("https://foo.localhost/some/path?projectId=bar", {})
      )?.mode
    ).toMatchInlineSnapshot(`"published"`);
  });
});
