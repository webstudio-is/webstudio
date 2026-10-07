import { expect, test } from "vitest";
import { capturePreviewFormExchange } from "./preview-form-inspection.server";

test("Preview exchange hides credentials and unknown server values while retaining actual public data", async () => {
  const request = new Request(
    "https://example.com/send?token=url-token&q=hello",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer auth-secret",
        Cookie: "session=cookie-secret",
        "X-API-Key": "api-secret",
        Referer: "https://builder.test/private?token=builder-token",
      },
      body: JSON.stringify({
        email: "ada@example.com",
        password: "input-password",
        derived: "server-private",
        value: "hello",
      }),
    }
  );
  Object.defineProperty(request, "url", {
    value: "https://user:url-password@example.com/send?token=url-token&q=hello",
  });
  const snapshot = await capturePreviewFormExchange(
    "resource",
    {
      request,
      response: {
        status: 201,
        statusText: "Created",
        headers: new Headers({
          "Content-Type": "application/json",
          "Set-Cookie": "session=response-cookie",
          "X-Auth-Token": "response-token",
        }),
        url: "https://example.com/final?token=url-token",
        data: {
          accepted: true,
          echo: "auth-secret",
          credential: "server-only-token",
        },
      },
    },
    {
      publicValues: new Set(["ada@example.com", "hello"]),
      privateValues: new Set([
        "input-password",
        "server-only-token",
        "builder-token",
      ]),
    }
  );
  const encoded = JSON.stringify(snapshot);
  for (const secret of [
    "url-password",
    "url-token",
    "auth-secret",
    "cookie-secret",
    "api-secret",
    "response-cookie",
    "response-token",
    "input-password",
    "server-only-token",
    "builder-token",
    "server-private",
  ]) {
    expect(encoded).not.toContain(secret);
  }
  expect(snapshot.request.method).toBe("POST");
  expect(snapshot.request.body).toEqual({
    email: "ada@example.com",
    password: "[redacted]",
    derived: "[redacted]",
    value: "hello",
  });
  expect(snapshot.response.status).toBe(201);
  expect(snapshot.response.url).toContain("/final");
  expect(snapshot.response.body).toEqual({
    accepted: true,
    echo: "[redacted]",
    credential: "[redacted]",
  });
});

test("multipart inspection reports file metadata without upload bytes", async () => {
  const formData = new FormData();
  formData.set("email", "ada@example.com");
  formData.set(
    "file",
    new File(["private-upload-bytes"], "hello.txt", { type: "text/plain" })
  );
  const request = new Request("https://example.com/send", {
    method: "POST",
    body: formData,
  });
  const snapshot = await capturePreviewFormExchange(
    "resource",
    {
      request,
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        data: "accepted",
      },
    },
    { publicValues: new Set(["ada@example.com"]), privateValues: new Set() }
  );
  expect(
    snapshot.request.headers.find(({ name }) => name === "content-type")?.value
  ).toContain("multipart/form-data; boundary=");
  expect(snapshot.request.body).toEqual({
    email: "ada@example.com",
    file: { name: "hello.txt", type: "text/plain", size: 20 },
  });
  expect(JSON.stringify(snapshot)).not.toContain("private-upload-bytes");
});

test("inspection preserves repeated query parameters and sanitizes relative Location credentials", async () => {
  const snapshot = await capturePreviewFormExchange(
    "resource",
    {
      request: new Request(
        "https://example.com/send?item=one&item=two&token=first&token=second"
      ),
      response: {
        status: 302,
        statusText: "Found",
        headers: new Headers({
          Location: "/receipt?item=one&item=two&token=redirect-secret",
        }),
        data: null,
      },
    },
    { publicValues: new Set(), privateValues: new Set() }
  );
  expect([...new URL(snapshot.request.url).searchParams]).toEqual([
    ["item", "one"],
    ["item", "two"],
    ["token", "[redacted]"],
    ["token", "[redacted]"],
  ]);
  const location = snapshot.response.headers.find(
    ({ name }) => name === "location"
  )!.value;
  expect(new URL(location).pathname).toBe("/receipt");
  expect(new URL(location).searchParams.getAll("item")).toEqual(["one", "two"]);
  expect(new URL(location).searchParams.get("token")).toBe("[redacted]");
  expect(JSON.stringify(snapshot)).not.toContain("redirect-secret");
});

test.each([
  "x".repeat(4097),
  Array.from({ length: 101 }, (_, index) => index),
  Object.fromEntries(
    Array.from({ length: 101 }, (_, index) => [`field${index}`, index])
  ),
  { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: true } } } } } } } } } },
  Array.from({ length: 100 }, () => "x".repeat(4096)),
])("inspection reports every body limit as truncated", async (body) => {
  const snapshot = await capturePreviewFormExchange(
    "resource",
    {
      request: new Request("https://example.com/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        data: body,
      },
    },
    {
      publicValues: new Set([
        "x".repeat(4097),
        "x".repeat(4096),
        "true",
        ...Array.from({ length: 101 }, (_, index) => String(index)),
      ]),
      privateValues: new Set(),
    }
  );
  expect(snapshot.request.truncated).toBe(true);
  expect(snapshot.response.truncated).toBe(true);
});
