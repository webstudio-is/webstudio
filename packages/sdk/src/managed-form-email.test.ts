import { expect, test, vi } from "vitest";
import {
  createCloudflareManagedFormEmailSender,
  validateCloudflareManagedFormEmail,
} from "./managed-form-email";
import {
  loadManagedFormResources,
  validateManagedFormBodyFormats,
} from "./managed-form-submission";
import { loadResources } from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";

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
    attachments: [
      {
        filename: "hello.txt",
        contentType: "text/plain",
        contentBase64: "aGVsbG8=",
      },
    ],
  });
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
