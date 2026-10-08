import { expect, test, vi } from "vitest";
import {
  cloudflareManagedFormPreviewEmailServiceUrl,
  createCloudflareManagedFormEmailSender as createEmailSender,
  createCloudflareManagedFormEmailSenderWithUrl,
  prepareVisitorEmailRequest,
  validateCloudflareManagedFormEmail,
} from "./managed-form-email";
import {
  loadManagedFormResources,
  validateManagedFormBodyFormats,
} from "./managed-form-submission";
import { loadResources } from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const createCloudflareManagedFormEmailSender = (
  service: Parameters<typeof createEmailSender>[0],
  formData: FormData
) => createEmailSender(service, formData, projectId);

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
    fromName: "Visitor replies",
    subject: "New submission",
    body: "Text body",
    includeAttachments: true,
  },
};

const visitorRequest = (body = ""): ResourceRequest => ({
  ...request,
  email: {
    ...request.email!,
    recipientMode: "visitor",
    visitorEmailField: "email",
    recipients: [],
    body,
    includeAttachments: false,
  },
});

test("visitor Email Resource uses one submitted address and prepends the site receipt", () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  formData.append("password", "private value");
  formData.append("upload", new File(["secret"], "private.txt"));
  const prepared = prepareVisitorEmailRequest(
    visitorRequest("Custom text"),
    formData,
    "https://published.example"
  );
  expect(prepared.email).toMatchObject({
    recipients: [{ address: "visitor@example.com" }],
    body: "We received your request from https://published.example.\n\nCustom text",
    includeAttachments: false,
  });
  expect(JSON.stringify(prepared)).not.toContain("private value");
  expect(JSON.stringify(prepared)).not.toContain("private.txt");
  expect(
    prepareVisitorEmailRequest(
      visitorRequest(),
      formData,
      "https://published.example"
    ).email?.body
  ).toBe("We received your request from https://published.example.");
});

test("visitor Email Resource rejects repeated, missing, and invalid addresses", () => {
  const formData = new FormData();
  const prepare = () =>
    prepareVisitorEmailRequest(
      visitorRequest(),
      formData,
      "https://published.example"
    );
  expect(prepare).toThrow("one valid email field");
  formData.set("email", "Name <visitor@example.com>");
  expect(prepare).toThrow("one valid email field");
  formData.set("email", "visitor@example.com, other@example.com");
  expect(prepare).toThrow("one valid email field");
  formData.set("email", "visitor@example.com");
  formData.append("email", "other@example.com");
  expect(prepare).toThrow("one valid email field");
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
  expect(new Headers(init.headers).get("x-webstudio-project-id")).toBe(
    projectId
  );
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

test("sends Preview email to the canonical URL with server-only authorization", async () => {
  const fetcher = vi.fn(async () => Response.json({ id: "preview-sent" }));
  const sendEmail = createCloudflareManagedFormEmailSenderWithUrl(
    cloudflareManagedFormPreviewEmailServiceUrl,
    "worker-secret",
    new FormData(),
    projectId,
    fetcher
  )!;

  const result = await sendEmail(request, {});

  expect(result).toMatchObject({
    ok: true,
    status: 200,
    data: { id: "preview-sent" },
  });
  expect(fetcher).toHaveBeenCalledOnce();
  const [url, init] = fetcher.mock.calls[0] as unknown as [
    URL,
    RequestInit & { redirect: RequestRedirect },
  ];
  expect(url.href).toBe("https://apps.webstudio.is/v1/preview-send");
  expect(init.method).toBe("POST");
  expect(init.redirect).toBe("error");
  const headers = new Headers(init.headers);
  expect(headers.get("authorization")).toBe("Bearer worker-secret");
  expect(headers.get("x-webstudio-project-id")).toBe(projectId);
  expect(JSON.parse(init.body as string)).toMatchObject({
    to: [{ address: "team@example.com", name: "Team" }],
    subject: "New submission",
    text: "Text body",
  });
});

test("does not create a Preview sender without both URL and token", () => {
  expect(
    createCloudflareManagedFormEmailSenderWithUrl(
      cloudflareManagedFormPreviewEmailServiceUrl,
      undefined,
      new FormData(),
      projectId
    )
  ).toBeUndefined();
  expect(
    createCloudflareManagedFormEmailSenderWithUrl(
      undefined,
      "worker-secret",
      new FormData(),
      projectId
    )
  ).toBeUndefined();
});

test("rejects insecure or credential-bearing Preview service URLs", () => {
  for (const url of [
    "http://apps.webstudio.is/v1/preview-send",
    "https://user:password@apps.webstudio.is/v1/preview-send",
    "https://apps.webstudio.is/prefix",
    "https://apps.webstudio.is/v1/preview-send?token=secret",
    "https://apps.webstudio.is/v1/preview-send#secret",
    "https://apps.webstudio.is:8443/v1/preview-send",
    "https://staging-webstudio-email-service.wstd.workers.dev/v1/preview-send",
    "https://another-account.workers.dev/v1/preview-send",
  ]) {
    expect(() =>
      createCloudflareManagedFormEmailSenderWithUrl(
        url,
        "worker-secret",
        new FormData(),
        projectId
      )
    ).toThrow("approved Preview endpoint");
  }
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
        fromName: undefined,
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

test("passes the Email Service per-site delivery limit back as a failed send", async () => {
  const fetch = vi.fn(async () =>
    Response.json(
      {
        error: {
          code: "email_rate_limited",
          message: "Email sending limit reached",
        },
      },
      { status: 429 }
    )
  );
  const sendEmail = createCloudflareManagedFormEmailSender(
    { fetch },
    new FormData()
  )!;
  expect(await sendEmail(request, {})).toMatchObject({
    ok: false,
    status: 429,
    statusText: "Email sending limit reached",
    data: { error: { code: "email_rate_limited" } },
  });
  expect(fetch).toHaveBeenCalledOnce();
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

test("leaves mailbox and attachment metadata policy to the Email Service", () => {
  const formData = new FormData();
  const invalidMetadata = new File(["x"], "bad\r\nname.txt");
  Object.defineProperty(invalidMetadata, "type", {
    value: "text/plain\r\nBcc: victim@example.com",
  });
  formData.append("upload", invalidMetadata);
  expect(() =>
    validateCloudflareManagedFormEmail(
      {
        ...request,
        email: {
          ...request.email!,
          recipients: [{ address: "bad\r\nBcc: victim@example.com" }],
        },
      },
      formData
    )
  ).not.toThrow();
});

test("propagates Worker rejection for mailbox or attachment policy", async () => {
  const fetch = vi.fn(async () =>
    Response.json(
      {
        error: { code: "EMAIL_INVALID", message: "Email settings are invalid" },
      },
      { status: 400 }
    )
  );
  const sendEmail = createCloudflareManagedFormEmailSender(
    { fetch },
    new FormData()
  )!;
  const result = await sendEmail(
    {
      ...request,
      email: {
        ...request.email!,
        recipients: [{ address: "bad\r\nBcc: victim@example.com" }],
      },
    },
    {}
  );
  expect(result).toMatchObject({
    ok: false,
    status: 400,
    statusText: "Email settings are invalid",
    data: { error: { code: "EMAIL_INVALID" } },
  });
  expect(fetch).toHaveBeenCalledOnce();
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

test.each(["New form submission", "Custom owner subject"])(
  "owner subject %s keeps one reference on retry and changes for another submission",
  async (subject) => {
    const sendEmail = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Unavailable",
        data: null,
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        data: { id: "sent" },
      });
    const graph = {
      rootIds: ["email"],
      resources: [
        {
          id: "email",
          outputName: "Email",
          control: "email" as const,
          dependencies: [],
          createRequest: () => ({
            ...request,
            email: { ...request.email!, subject },
          }),
        },
      ],
    };
    const options = {
      sendEmail,
      retryFailedRoots: true,
      validateEmail: (emailRequest: ResourceRequest) =>
        validateCloudflareManagedFormEmail(emailRequest, new FormData()),
    };
    const now = vi.spyOn(Date, "now").mockReturnValue(123456789);
    try {
      await loadManagedFormResources(vi.fn(), graph, undefined, options);
      await loadManagedFormResources(vi.fn(), graph, undefined, options);
    } finally {
      now.mockRestore();
    }
    const subjects = sendEmail.mock.calls.map(
      ([emailRequest]) => emailRequest.email!.subject
    );
    expect(subjects).toHaveLength(3);
    expect(subjects[0]).toMatch(
      new RegExp(`^${subject} \\[([0-9a-f]{16})\\]$`)
    );
    expect(subjects[1]).toBe(subjects[0]);
    expect(subjects[2]).not.toBe(subjects[0]);
  }
);

test.each([
  { name: "empty", subject: "" },
  { name: "too long after suffix", subject: "a".repeat(980) },
])(
  "$name owner subject blocks every destination before dispatch",
  async ({ subject }) => {
    const httpFetch = vi.fn(async () => Response.json({ ok: true }));
    const sendEmail = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      data: null,
    }));
    const graph = {
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
          createRequest: () => ({
            ...request,
            email: { ...request.email!, subject },
          }),
        },
      ],
    };
    await expect(
      loadManagedFormResources(httpFetch, graph, undefined, { sendEmail })
    ).rejects.toThrow("Email subject is invalid");
    expect(httpFetch).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  }
);

test("owner subject fits the maximum length with its reference", async () => {
  const sendEmail = vi.fn(async (_emailRequest: ResourceRequest) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    data: null,
  }));
  await loadManagedFormResources(
    vi.fn(),
    {
      rootIds: ["email"],
      resources: [
        {
          id: "email",
          outputName: "Email",
          control: "email",
          dependencies: [],
          createRequest: () => ({
            ...request,
            email: { ...request.email!, subject: "a".repeat(979) },
          }),
        },
      ],
    },
    undefined,
    { sendEmail }
  );
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(sendEmail.mock.calls[0][0].email?.subject).toHaveLength(998);
});

test("oversize Email preflight stops both Email and HTTP destinations", async () => {
  const formData = new FormData();
  const file = new File([new Uint8Array(6 * 1024 * 1024)], "large.bin");
  const readFile = vi.spyOn(file, "arrayBuffer");
  formData.append("upload", file);
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
  ).rejects.toThrow("Email attachments are too large to encode");
  expect(httpFetch).not.toHaveBeenCalled();
  expect(emailFetch).not.toHaveBeenCalled();
  expect(readFile).not.toHaveBeenCalled();
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
