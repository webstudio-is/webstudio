import { expect, test } from "vitest";
import { defaultEmailBody, defaultEmailSubject } from "@webstudio-is/sdk";
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
      resourceName: "Contact webhook",
      publicValues: new Set(["ada@example.com", "hello"]),
      privateValues: new Set([
        "input-password",
        "server-only-token",
        "builder-token",
      ]),
    }
  );
  const encoded = JSON.stringify(snapshot);
  expect(snapshot.resourceName).toBe("Contact webhook");
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

test("an HTTP Resource targeting the Email Service URL keeps request-body redaction", async () => {
  const snapshot = await capturePreviewFormExchange(
    "http-resource",
    {
      kind: "http",
      request: new Request("https://email-service.internal/v1/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "private request value" }),
      }),
      response: {
        status: 403,
        statusText: "Forbidden",
        headers: new Headers(),
        data: { error: "denied" },
      },
    },
    { publicValues: new Set(), privateValues: new Set() }
  );

  expect(snapshot.kind).toBe("http");
  expect(snapshot.request.body).toEqual({ message: "[redacted]" });
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

test.each(["response URL", "request Location", "response Location"])(
  "inspection collects credentials from %s before rendering any field",
  async (source) => {
    const request = new Request(
      "https://example.com/send?note=redirect-secret",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "redirect-secret",
          ...(source === "request Location"
            ? { location: "/receipt?token=redirect-secret" }
            : {}),
        },
        body: JSON.stringify({ note: "redirect-secret", value: "visible" }),
      }
    );
    const snapshot = await capturePreviewFormExchange(
      "resource",
      {
        request,
        response: {
          status: 302,
          statusText: "Found",
          ...(source === "response URL"
            ? { url: "https://example.com/receipt?token=redirect-secret" }
            : {}),
          headers: new Headers(
            source === "response Location"
              ? { location: "/receipt?token=redirect-secret" }
              : {}
          ),
          data: { note: "redirect-secret", value: "visible" },
        },
      },
      {
        publicValues: new Set(),
        privateValues: new Set(),
        allowRequestBody: true,
      }
    );
    expect(new URL(snapshot.request.url).searchParams.get("note")).toBe(
      "[redacted]"
    );
    expect(snapshot.request.headers).toContainEqual({
      name: "accept",
      value: "[redacted]",
    });
    expect(snapshot.request.body).toEqual({
      note: "[redacted]",
      value: "visible",
    });
    expect(snapshot.response.body).toEqual({
      note: "[redacted]",
      value: "visible",
    });
    expect(JSON.stringify(snapshot)).not.toContain("redirect-secret");
  }
);

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

test("Email inspection preserves logical request and outcome while redacting adapter credentials", async () => {
  const snapshot = await capturePreviewFormExchange(
    "email-resource",
    {
      request: {
        name: "Receipt",
        control: "email",
        method: "post",
        url: "",
        headers: [],
        searchParams: [],
        email: {
          recipientMode: "visitor",
          recipients: [{ address: "ada@example.com" }],
          subject: "Receipt subject [0123456789abcdef]",
          body: "Submitted message",
          includeAttachments: false,
        },
      },
      response: {
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers(),
        data: {
          error: { code: "email_rate_limited", message: "limited" },
          echo: "server-only-token",
        },
      },
    },
    {
      publicValues: new Set([
        "visitor",
        "ada@example.com",
        "Receipt subject",
        "Submitted message",
        "false",
      ]),
      privateValues: new Set(["server-only-token"]),
    }
  );
  expect(snapshot.kind).toBe("email");
  expect(snapshot.request.headers).toEqual([]);
  expect(snapshot.request.body).toMatchObject({
    recipients: [{ address: "ada@example.com" }],
    subject: "Receipt subject [0123456789abcdef]",
    body: "Submitted message",
  });
  expect(snapshot.response).toMatchObject({
    status: 429,
    body: { error: { code: "email_rate_limited" }, echo: "[redacted]" },
  });
  expect(JSON.stringify(snapshot)).not.toContain("server-only-token");
});

test("Email inspection preserves safe service response headers and redacts credentials", async () => {
  const snapshot = await capturePreviewFormExchange(
    "email-resource",
    {
      kind: "email",
      request: {
        name: "Receipt",
        control: "email",
        method: "post",
        url: "",
        headers: [],
        searchParams: [],
        email: {
          recipientMode: "project",
          recipients: [{ address: "team@example.com" }],
          subject: "Receipt subject",
          body: "Submitted message",
          includeAttachments: false,
        },
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers({
          "x-email-service-id": "message-id",
          "set-cookie": "session=private-cookie",
        }),
        data: {
          error: { code: "DELIVERY_FAILED", message: "Delivery rejected" },
        },
      },
      outcome: {
        ok: false,
        status: 502,
        statusText: "Email service returned an invalid response",
        data: {
          ok: false,
          error: {
            code: "EMAIL_SERVICE_ERROR",
            message: "Email service returned an invalid response",
          },
        },
      },
    },
    {
      publicValues: new Set([
        "team@example.com",
        "Receipt subject",
        "Submitted message",
      ]),
      privateValues: new Set(),
    }
  );

  expect(snapshot.response.headers).toContainEqual({
    name: "x-email-service-id",
    value: "message-id",
  });
  expect(snapshot.response.headers).toContainEqual({
    name: "set-cookie",
    value: "[redacted]",
  });
  expect(snapshot.response).toMatchObject({
    status: 200,
    statusText: "OK",
    body: {
      error: { code: "DELIVERY_FAILED", message: "Delivery rejected" },
    },
  });
  expect(snapshot.outcome).toMatchObject({
    ok: false,
    status: 502,
    body: {
      ok: false,
      error: { code: "EMAIL_SERVICE_ERROR" },
    },
  });
  expect(JSON.stringify(snapshot)).not.toContain("private-cookie");
});

test("Email transport inspection keeps attachment metadata but omits encoded file bytes", async () => {
  const contentBase64 = btoa("private attachment bytes");
  const snapshot = await capturePreviewFormExchange(
    "email-resource",
    {
      kind: "email",
      request: new Request("https://apps.webstudio.is/v1/preview-send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: [{ address: "alex@example.com" }],
          attachments: [
            {
              filename: "receipt.txt",
              contentType: "text/plain",
              contentBase64,
            },
          ],
        }),
      }),
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        data: { id: "sent" },
      },
    },
    {
      publicValues: new Set(["alex@example.com"]),
      privateValues: new Set(),
      allowRequestBody: true,
    }
  );

  expect(snapshot.kind).toBe("email");
  expect(snapshot.request.body).toEqual({
    to: [{ address: "alex@example.com" }],
    attachments: [
      {
        filename: "receipt.txt",
        contentType: "text/plain",
        contentBase64: "[redacted]",
      },
    ],
  });
  expect(JSON.stringify(snapshot)).not.toContain(contentBase64);
});

test("a submission reference does not make a private Email subject inspectable", async () => {
  const snapshot = await capturePreviewFormExchange(
    "email",
    {
      request: {
        name: "Email",
        control: "email",
        method: "post",
        url: "",
        headers: [],
        searchParams: [],
        email: {
          recipientMode: "project",
          recipients: [],
          subject: "private-derived-subject [0123456789abcdef]",
          body: "",
          includeAttachments: false,
        },
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        data: { id: "sent" },
      },
    },
    { publicValues: new Set(), privateValues: new Set() }
  );
  expect(snapshot.request.body).toMatchObject({ subject: "[redacted]" });
});

test("platform Email defaults remain inspectable without exposing credentials", async () => {
  const snapshot = await capturePreviewFormExchange(
    "email",
    {
      request: {
        name: "Email",
        control: "email",
        method: "post",
        url: "",
        headers: [],
        searchParams: [],
        email: {
          recipientMode: "project",
          recipients: [],
          subject: `${defaultEmailSubject} [0123456789abcdef]`,
          body: defaultEmailBody,
          includeAttachments: false,
        },
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        data: { id: "sent" },
      },
    },
    {
      publicValues: new Set([defaultEmailSubject, defaultEmailBody]),
      privateValues: new Set(["server-only-token"]),
    }
  );
  expect(snapshot.request.body).toMatchObject({
    subject: `${defaultEmailSubject} [0123456789abcdef]`,
    body: defaultEmailBody,
  });
  expect(JSON.stringify(snapshot)).not.toContain("server-only-token");
});
