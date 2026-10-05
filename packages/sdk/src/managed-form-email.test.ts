import { expect, test, vi } from "vitest";
import {
  createCloudflareManagedFormEmailSender,
  prepareVisitorConfirmation,
  sendVisitorConfirmation,
  validateCloudflareManagedFormEmail,
} from "./managed-form-email";
import {
  loadManagedFormResources,
  validateManagedFormBodyFormats,
} from "./managed-form-submission";
import { loadResources } from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";
import { defaultEmailConfirmationBody } from "./email-resource";

const request: ResourceRequest = {
  name: "Team email",
  control: "email",
  method: "post",
  url: "",
  searchParams: [],
  headers: [],
  email: {
    recipientMode: "project",
    recipients: [{ address: "team@example.com", name: "Team" }],
    sender: { address: "reply@example.com", name: "Visitor replies" },
    subject: "New submission",
    body: "Text body",
    includeAttachments: true,
  },
};

const prepareConfirmation = (formData: FormData, fieldName = "email") =>
  prepareVisitorConfirmation({
    fieldName,
    formData,
    subject: "We received your submission",
    body: "Thank you.",
    isDefaultBody: false,
    siteUrl: "https://published.example",
  });

test("visitor confirmation is off by default and uses only one named email field", () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  formData.append("password", "private value");
  formData.append("upload", new File(["secret"], "private.txt"));
  expect(prepareConfirmation(formData, "")).toBeUndefined();
  expect(prepareConfirmation(formData)).toMatchObject({
    email: {
      recipients: [{ address: "visitor@example.com" }],
      subject: "We received your submission",
      body: "Thank you.",
      includeAttachments: false,
    },
  });
  expect(JSON.stringify(prepareConfirmation(formData))).not.toContain(
    "private value"
  );
  expect(JSON.stringify(prepareConfirmation(formData))).not.toContain(
    "private.txt"
  );
});

test("visitor confirmation rejects repeated, missing, and invalid email fields", () => {
  const formData = new FormData();
  expect(() => prepareConfirmation(formData)).toThrow("one valid email field");
  formData.set("email", "Name <visitor@example.com>");
  expect(() => prepareConfirmation(formData)).toThrow("one valid email field");
  formData.set("email", "visitor@example.com, other@example.com");
  expect(() => prepareConfirmation(formData)).toThrow("one valid email field");
  formData.append("email", "invalid");
  expect(() => prepareConfirmation(formData)).toThrow("one valid email field");
  formData.set("email", "visitor@example.com");
  formData.append("email", "other@example.com");
  expect(() => prepareConfirmation(formData)).toThrow("one valid email field");
});

test("default confirmation mentions the published site and custom text stays literal", () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  const defaults = prepareVisitorConfirmation({
    fieldName: "email",
    formData,
    subject: "Received",
    body: defaultEmailConfirmationBody,
    isDefaultBody: true,
    siteUrl: "https://published.example",
  });
  expect(defaults?.email?.body).toContain("https://published.example");
  const explicitlySavedDefaultText = prepareVisitorConfirmation({
    fieldName: "email",
    formData,
    subject: "Received",
    body: defaultEmailConfirmationBody,
    isDefaultBody: false,
    siteUrl: "https://published.example",
  });
  expect(explicitlySavedDefaultText?.email?.body).toBe(
    defaultEmailConfirmationBody
  );
  expect(prepareConfirmation(formData)?.email?.body).toBe("Thank you.");
});

test("visitor confirmation subject rejects line breaks before delivery", () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  expect(() =>
    prepareVisitorConfirmation({
      fieldName: "email",
      formData,
      subject: "Thanks\nBcc: other@example.com",
      body: "Thank you.",
      isDefaultBody: false,
      siteUrl: "https://published.example",
    })
  ).toThrow("Email subject must be text without line breaks");
});

test("visitor confirmation follows primary success and failure stays nonfatal", async () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  const confirmation = prepareConfirmation(formData)!;
  const send = vi.fn(async () => ({
    ok: false,
    status: 429,
    statusText: "Quota exceeded",
    data: { error: { code: "EMAIL_QUOTA" } },
  }));
  const primaryFailure = {
    success: false,
    status: 502,
    results: [],
    errors: [{ status: 502, body: null, message: "Primary failed" }],
  };
  expect(
    await sendVisitorConfirmation(primaryFailure, confirmation, send)
  ).toEqual(primaryFailure);
  expect(send).not.toHaveBeenCalled();
  const response = await sendVisitorConfirmation(
    { success: true, status: 200, results: [], errors: [] },
    confirmation,
    send
  );
  expect(send).toHaveBeenCalledTimes(1);
  expect(response).toMatchObject({
    success: true,
    status: 200,
    errors: [
      {
        resourceId: "visitor-confirmation",
        status: 429,
        message: "Quota exceeded",
      },
    ],
  });
});

test("provider fake receives one private visitor envelope without attachments", async () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  formData.append("upload", new File(["private"], "private.txt"));
  const fetch = vi.fn(async () => Response.json({ id: "confirmation-sent" }));
  const send = createCloudflareManagedFormEmailSender({ fetch }, formData);
  const response = await sendVisitorConfirmation(
    { success: true, status: 200, results: [], errors: [] },
    prepareConfirmation(formData),
    send
  );
  expect(response).toMatchObject({ success: true, errors: [] });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(init.body as string)).toEqual({
    to: [{ address: "visitor@example.com" }],
    subject: "We received your submission",
    text: "Thank you.",
  });
});

test.each([
  [
    "Webstudio Team <reply@example.com>",
    { address: "reply@example.com", name: "Webstudio Team" },
    "Webstudio Team",
  ],
  ["reply@example.com", { address: "reply@example.com" }, undefined],
] as const)(
  "visitor confirmation forwards project Sender %s",
  async (sender, replyTo, fromName) => {
    const formData = new FormData();
    formData.set("email", "visitor@example.com");
    const fetch = vi.fn(async () => Response.json({ id: "sent" }));
    const send = createCloudflareManagedFormEmailSender({ fetch }, formData);
    await sendVisitorConfirmation(
      { success: true, status: 200, results: [], errors: [] },
      prepareVisitorConfirmation({
        fieldName: "email",
        formData,
        subject: "Receipt",
        body: "Thanks",
        isDefaultBody: false,
        siteUrl: "https://published.example",
        sender,
      }),
      send
    );
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const envelope = JSON.parse(init.body as string);
    expect(envelope.replyTo).toEqual(replyTo);
    expect(envelope.fromName).toBe(fromName);
  }
);

test("invalid confirmation Sender fails before delivery", () => {
  const formData = new FormData();
  formData.set("email", "visitor@example.com");
  expect(() =>
    prepareVisitorConfirmation({
      fieldName: "email",
      formData,
      subject: "Receipt",
      body: "Thanks",
      isDefaultBody: false,
      siteUrl: "https://published.example",
      sender: "bad\nBcc: victim@example.com",
    })
  ).toThrow("Visitor confirmation Sender is invalid");
});

test("sends the private worker envelope with files and no form internals", async () => {
  const formData = new FormData();
  formData.append(
    "file",
    new File(["hello"], "hello.txt", { type: "text/plain" })
  );
  formData.append("ws--managed-form-id", "secret form id");
  const fetch = vi.fn(async () => Response.json({ id: "sent" }));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { fetch },
    formData
  )!;
  const result = await sendEmail(request, {});
  expect(result).toMatchObject({ ok: true, status: 200, data: { id: "sent" } });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://email-service.internal/v1/send");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body as string)).toEqual({
    to: [{ address: "team@example.com", name: "Team" }],
    subject: "New submission",
    text: "Text body",
    replyTo: { address: "reply@example.com", name: "Visitor replies" },
    fromName: "Visitor replies",
    attachments: [
      {
        filename: "hello.txt",
        contentType: "text/plain",
        contentBase64: "aGVsbG8=",
      },
    ],
  });
});

test("keeps an address-only Reply-To without a display name", async () => {
  const fetch = vi.fn(async () => Response.json({ id: "sent" }));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { fetch },
    new FormData()
  )!;
  await sendEmail(
    {
      ...request,
      email: {
        ...request.email!,
        sender: { address: "reply@example.com" },
      },
    },
    {}
  );
  const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(init.body as string)).toMatchObject({
    replyTo: { address: "reply@example.com" },
  });
  expect(JSON.parse(init.body as string)).not.toHaveProperty("fromName");
});

test("omits attachments when disabled and preserves worker errors", async () => {
  const formData = new FormData();
  formData.append("file", new File(["hello"], "hello.txt"));
  const fetch = vi.fn(async () =>
    Response.json(
      { error: { code: "EMAIL_REJECTED", message: "Rejected" } },
      { status: 502 }
    )
  );
  const sendEmail = createCloudflareManagedFormEmailSender(
    { fetch },
    formData
  )!;
  const result = await sendEmail(
    { ...request, email: { ...request.email!, includeAttachments: false } },
    {}
  );
  expect(result).toMatchObject({
    ok: false,
    status: 502,
    statusText: "Rejected",
    data: { error: { code: "EMAIL_REJECTED" } },
  });
  const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(init.body as string)).not.toHaveProperty("attachments");
});

test.each([undefined, null, "", "   ", 123])(
  "treats malformed successful Email ID %s as a provider error",
  async (id) => {
    const fetch = vi.fn(async () =>
      Response.json(id === undefined ? {} : { id })
    );
    const sendEmail = createCloudflareManagedFormEmailSender(
      { fetch },
      new FormData()
    )!;
    const result = await sendEmail(request, {});
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      data: { error: { code: "EMAIL_SERVICE_ERROR" } },
    });
  }
);

test("rejects malformed recipient addresses during preflight", () => {
  expect(() =>
    validateCloudflareManagedFormEmail(
      {
        ...request,
        email: {
          ...request.email!,
          recipients: [{ address: "bad\r\nBcc: victim@example.com" }],
        },
      },
      new FormData()
    )
  ).toThrow("Email settings are invalid");
});

test.each([
  ["empty filename", "", "text/plain"],
  ["long filename", "a".repeat(256), "text/plain"],
  ["filename line break", "bad\r\nname.txt", "text/plain"],
  ["long MIME type", "note.txt", "x".repeat(256)],
  ["MIME line break", "note.txt", "text/plain\r\nBcc: victim@example.com"],
])(
  "rejects %s during Email attachment preflight",
  (_, filename, contentType) => {
    const file = new File(["x"], filename);
    Object.defineProperty(file, "type", { value: contentType });
    const formData = new FormData();
    formData.append("upload", file);
    expect(() => validateCloudflareManagedFormEmail(request, formData)).toThrow(
      "Email attachment metadata is invalid"
    );
  }
);

test("accepts the attachment metadata length boundary", () => {
  const file = new File(["x"], "a".repeat(255));
  Object.defineProperty(file, "type", { value: "x".repeat(255) });
  const formData = new FormData();
  formData.append("upload", file);
  expect(() =>
    validateCloudflareManagedFormEmail(request, formData)
  ).not.toThrow();
});

test("invalid attachment metadata stops a sibling HTTP destination", async () => {
  const formData = new FormData();
  formData.append("upload", new File(["x"], "bad\nname.txt"));
  const httpFetch = vi.fn(async () => Response.json({ ok: true }));
  const emailFetch = vi.fn(async () => Response.json({ id: "sent" }));
  const graph = validateManagedFormBodyFormats(
    {
      rootIds: ["http", "email"],
      resources: [
        {
          id: "http",
          outputName: "HTTP",
          dependencies: [],
          createRequest: () => ({
            ...request,
            control: undefined,
            url: "https://example.com/submit",
          }),
        },
        {
          id: "email",
          outputName: "Email",
          control: "email" as const,
          dependencies: [],
          createRequest: () => request,
        },
      ],
    },
    formData,
    true
  );
  await expect(
    loadManagedFormResources(httpFetch, graph, undefined, {
      sendEmail: createCloudflareManagedFormEmailSender(
        { fetch: emailFetch },
        formData
      ),
      validateEmail: (resource) =>
        validateCloudflareManagedFormEmail(resource, formData),
    })
  ).rejects.toThrow("Email attachment metadata is invalid");
  expect(httpFetch).not.toHaveBeenCalled();
  expect(emailFetch).not.toHaveBeenCalled();
});

test("does not send after cancellation", async () => {
  const fetch = vi.fn(async () => Response.json({ id: "sent" }));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { fetch },
    new FormData()
  )!;
  const result = await sendEmail(request, { signal: AbortSignal.abort() });
  expect(result).toMatchObject({ ok: false, status: 499 });
  expect(fetch).not.toHaveBeenCalled();
});

test("a failed Email root retries once and keeps sibling results", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { error: { code: "UNAVAILABLE", message: "Unavailable" } },
        { status: 503 }
      )
    )
    .mockResolvedValueOnce(Response.json({ id: "sent" }));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { fetch },
    new FormData()
  );
  const results = await loadResources(
    vi.fn(async () => Response.json({ ok: true })),
    {
      rootIds: ["email", "http"],
      resources: [
        {
          id: "email",
          outputName: "Email",
          dependencies: [],
          control: "email",
          createRequest: () => request,
        },
        {
          id: "http",
          outputName: "HTTP",
          dependencies: [],
          createRequest: () => ({
            ...request,
            name: "HTTP",
            control: undefined,
            url: "https://example.com",
          }),
        },
      ],
    },
    undefined,
    { sendEmail, retryFailedRoots: true }
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(results).toMatchObject({
    Email: { ok: true, data: { id: "sent" } },
    HTTP: { ok: true },
  });
});

test("oversize Email preflight stops both Email and HTTP destinations", async () => {
  const formData = new FormData();
  formData.append(
    "upload",
    new File([new Uint8Array(4 * 1024 * 1024)], "large.bin")
  );
  const emailFetch = vi.fn(async () => Response.json({ id: "sent" }));
  const httpFetch = vi.fn(async () => Response.json({ ok: true }));
  const graph = {
    rootIds: ["http", "email"],
    resources: [
      {
        id: "http",
        outputName: "HTTP",
        dependencies: [],
        createRequest: () => ({
          ...request,
          name: "HTTP",
          control: undefined,
          url: "https://example.com/submit",
        }),
      },
      {
        id: "email",
        outputName: "Email",
        dependencies: [],
        control: "email" as const,
        emailRecipientCount: 1,
        createRequest: () => request,
      },
    ],
  };
  const prepared = validateManagedFormBodyFormats(graph, formData, true);
  await expect(
    loadManagedFormResources(httpFetch, prepared, undefined, {
      sendEmail: createCloudflareManagedFormEmailSender(
        { fetch: emailFetch },
        formData
      ),
      validateEmail: (resource) =>
        validateCloudflareManagedFormEmail(resource, formData),
    })
  ).rejects.toThrow("Email content is too large");
  expect(httpFetch).not.toHaveBeenCalled();
  expect(emailFetch).not.toHaveBeenCalled();
});

test("dependency-bound Email stops its HTTP lookup before dispatch", async () => {
  const formData = new FormData();
  const httpFetch = vi.fn(async () => Response.json({ ok: true }));
  const graph = validateManagedFormBodyFormats(
    {
      rootIds: ["email"],
      resources: [
        {
          id: "lookup",
          outputName: "Lookup",
          dependencies: [],
          createRequest: () => ({
            ...request,
            control: undefined,
            url: "https://example.com/lookup",
          }),
        },
        {
          id: "email",
          outputName: "Email",
          dependencies: ["lookup"],
          control: "email" as const,
          createRequest: () => ({
            ...request,
            email: {
              ...request.email!,
              recipients: [{ address: "invalid" }],
            },
          }),
        },
      ],
    },
    formData,
    true
  );
  await expect(
    loadManagedFormResources(httpFetch, graph, undefined, {
      validateEmail: (resource) =>
        validateCloudflareManagedFormEmail(resource, formData),
    })
  ).rejects.toThrow("Email Resources cannot depend on other Resources");
  expect(httpFetch).not.toHaveBeenCalled();
});
