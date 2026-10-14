import { expect, test, vi } from "vitest";
import {
  createCloudflareManagedFormEmailSender as createEmailSender,
  createCloudflareManagedFormEmailSenderWithUrl,
  prepareVisitorEmailRequest,
  validateCloudflareManagedFormEmail,
} from "./managed-form-email";
import {
  loadManagedFormResources,
  shouldRetryManagedFormDestination,
  validateManagedFormBodyFormats,
} from "./managed-form-submission";
import { loadResourcesWithEmail } from "./email-resource-delivery";
import type { Resource, ResourceRequest } from "./schema/resources";
import { generateResourceRequestFields } from "./resources-generator";
import { generateEmailRequestFields } from "./email-resource-generator";
import {
  defaultVisitorConfirmationBody,
  emailSettingsInvalidMessage,
} from "./email-resource";
import { createScope } from "./scope";

const emailWorkerOrigin = "https://webstudio-email-service.wstd.workers.dev";
const emailProcedureUrl = `${emailWorkerOrigin}/trpc/email.send`;
type EmailService = NonNullable<Parameters<typeof createEmailSender>[0]>;
const successfulSend = () =>
  vi.fn<EmailService["sendEmail"]>(async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    data: { id: "sent" },
  }));
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

const visitorRequest = (
  body = "",
  includeAttachments = true
): ResourceRequest => ({
  ...request,
  email: {
    ...request.email!,
    recipientMode: "visitor",
    visitorEmailField: "email",
    recipients: [],
    body,
    includeAttachments,
  },
});

test("visitor Email Resource uses one submitted address and keeps custom copy", () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  formData.append("password", "private value");
  formData.append("upload", new File(["secret"], "private.txt"));
  const prepared = prepareVisitorEmailRequest(
    visitorRequest("Custom text"),
    formData
  );
  expect(prepared.email).toMatchObject({
    recipients: [{ address: "visitor@example.com" }],
    body: "Custom text",
    includeAttachments: true,
  });
  expect(JSON.stringify(prepared)).not.toContain("private value");
  expect(JSON.stringify(prepared)).not.toContain("private.txt");
  expect(
    prepareVisitorEmailRequest(visitorRequest(), formData).email?.body
  ).toBe("");
});

test("default visitor confirmation identifies the resolved sender and keeps custom copy", () => {
  const formData = new FormData();
  formData.set("email", "visitor@example.com");
  const defaultCopy = prepareVisitorEmailRequest(
    {
      ...visitorRequest(defaultVisitorConfirmationBody),
      email: {
        ...visitorRequest().email!,
        fromName: "Nike GmbH",
        subject: "New shoes",
        body: defaultVisitorConfirmationBody,
        confirmationSubject: "formSubject",
        confirmationBody: "default",
      },
    },
    formData
  );
  expect(defaultCopy.email?.subject).toBe(
    "Nike GmbH received your email: New shoes"
  );
  expect(defaultCopy.email?.body).toBe(
    "Thank you for your message.\n\nWe received it and will respond as soon as possible.\n\nNike GmbH"
  );

  const customCopy = prepareVisitorEmailRequest(
    visitorRequest("Custom message"),
    formData
  );
  expect(customCopy.email?.subject).toBe("New submission");
  expect(customCopy.email?.body).toBe("Custom message");

  const collidingCopy = prepareVisitorEmailRequest(
    {
      ...visitorRequest(defaultVisitorConfirmationBody),
      email: {
        ...visitorRequest().email!,
        fromName: "Nike GmbH",
        subject: "We received your message: New shoes",
        body: defaultVisitorConfirmationBody,
      },
    },
    formData
  );
  expect(collidingCopy.email?.subject).toBe(
    "We received your message: New shoes"
  );
  expect(collidingCopy.email?.body).toBe(defaultVisitorConfirmationBody);

  const mixedCopy = prepareVisitorEmailRequest(
    {
      ...visitorRequest(defaultVisitorConfirmationBody),
      email: {
        ...visitorRequest().email!,
        fromName: "Nike GmbH",
        subject: "Custom subject",
        body: defaultVisitorConfirmationBody,
        confirmationBody: "default",
      },
    },
    formData
  );
  expect(mixedCopy.email?.subject).toBe("Custom subject");
  expect(mixedCopy.email?.body).toBe(
    `${defaultVisitorConfirmationBody}\n\nNike GmbH`
  );
});

test("inherited visitor body becomes a sender-signed confirmation", () => {
  const formData = new FormData();
  formData.set("email", "visitor@example.com");
  const prepared = prepareVisitorEmailRequest(
    {
      ...visitorRequest(),
      email: {
        ...visitorRequest().email!,
        fromName: "Nike GmbH",
        confirmationSubject: "default",
        confirmationBody: "default",
      },
    },
    formData
  );
  expect(prepared.email?.subject).toBe("Nike GmbH received your email");
  expect(prepared.email?.body).toBe(
    `${defaultVisitorConfirmationBody}\n\nNike GmbH`
  );
});

test("visitor Email Resource includes files by default and respects opt-out", async () => {
  const formData = new FormData();
  formData.append("email", "visitor@example.com");
  formData.append(
    "upload",
    new File(["hello"], "hello.txt", { type: "text/plain" })
  );
  const rpc = successfulSend();
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    formData
  )!;
  const prepared = prepareVisitorEmailRequest(visitorRequest(), formData);

  expect(prepared.email?.includeAttachments).toBe(true);
  validateCloudflareManagedFormEmail(prepared, formData);
  await sendEmail(prepared, {});
  const [, payload] = rpc.mock.calls[0];
  expect(payload).toMatchObject({
    attachments: [
      {
        filename: "hello.txt",
        contentType: "text/plain",
        contentBase64: "aGVsbG8=",
      },
    ],
  });

  const excluded = prepareVisitorEmailRequest(
    visitorRequest("", false),
    formData
  );
  expect(excluded.email?.includeAttachments).toBe(false);
  await sendEmail(excluded, {});
  const [, excludedPayload] = rpc.mock.calls[1];
  expect(excludedPayload).not.toHaveProperty("attachments");
});

test("visitor Email Resource rejects repeated, missing, and invalid addresses", () => {
  const formData = new FormData();
  const prepare = () => prepareVisitorEmailRequest(visitorRequest(), formData);
  expect(prepare).toThrow("one valid email field");
  formData.set("email", "Name <visitor@example.com>");
  expect(prepare).toThrow("one valid email field");
  formData.set("email", "visitor@example.com, other@example.com");
  expect(prepare).toThrow("one valid email field");
  formData.set("email", "visitor@example.com");
  formData.append("email", "other@example.com");
  expect(prepare).toThrow("one valid email field");
});

test("sends the native RPC payload with files and no form internals", async () => {
  const formData = new FormData();
  formData.append(
    "file",
    new File(["hello"], "hello.txt", { type: "text/plain" })
  );
  formData.append("ws--managed-form-id", "secret form id");
  const rpc = successfulSend();
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    formData
  )!;
  const requestWithMessageId: ResourceRequest = {
    ...request,
    email: {
      ...request.email!,
      headers: { "X-Message-ID": "0123456789abcdef" },
    },
  };
  const result = await sendEmail(requestWithMessageId, {});
  expect(result).toMatchObject({ ok: true, status: 200, data: { id: "sent" } });
  expect(rpc).toHaveBeenCalledTimes(1);
  const [sentProjectId, payload] = rpc.mock.calls[0];
  expect(sentProjectId).toBe(projectId);
  expect(payload).toEqual({
    to: [{ address: "team@example.com", name: "Team" }],
    subject: "New submission",
    text: "Text body",
    headers: { "X-Message-ID": "0123456789abcdef" },
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

test.each([
  ["Project", { recipientMode: "project" as const }],
  [
    "Custom",
    { recipientMode: "custom" as const, recipients: "team@example.com" },
  ],
])(
  "ordinary %s Email Resource includes submitted files by default in the Email Service payload",
  async (_mode, email) => {
    const resource: Resource = {
      id: "email-resource",
      name: "Team email",
      control: "email",
      method: "post",
      url: '""',
      searchParams: [],
      headers: [],
      email,
    };
    const baseFields = generateResourceRequestFields({
      resource,
      indent: "",
      dataSources: new Map(),
      usedDataSources: new Map(),
      scope: createScope(),
    });
    const emailFields = generateEmailRequestFields({
      resource,
      indent: "",
      dataSources: new Map(),
      usedDataSources: new Map(),
      scope: createScope(),
      projectMeta: {
        contactEmail: "team@example.com",
        emailSender: "sender@example.com",
      },
    });
    const generatedRequest = new Function(
      `return ({${baseFields}${emailFields}})`
    )() as ResourceRequest;
    const formData = new FormData();
    formData.append(
      "upload",
      new File(["hello"], "hello.txt", { type: "text/plain" })
    );
    const rpc = successfulSend();
    const sendEmail = createCloudflareManagedFormEmailSender(
      { sendEmail: rpc },
      formData
    )!;

    expect(generatedRequest.email?.includeAttachments).toBe(true);
    await sendEmail(generatedRequest, {});

    const [, payload] = rpc.mock.calls[0];
    expect(payload).toMatchObject({
      attachments: [
        {
          filename: "hello.txt",
          contentType: "text/plain",
          contentBase64: "aGVsbG8=",
        },
      ],
    });
  }
);

test("published RPC does not create an HTTP inspection request", async () => {
  const rpc = successfulSend();
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  )!;
  const onEmailRequest = vi.fn();
  const onEmailResponse = vi.fn();
  await sendEmail(request, { onEmailRequest, onEmailResponse });
  expect(rpc).toHaveBeenCalledOnce();
  expect(onEmailRequest).not.toHaveBeenCalled();
  expect(onEmailResponse).not.toHaveBeenCalled();
});

test("sends Preview email to the approved endpoint with server-only authorization", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      result: {
        data: {
          ok: true,
          status: 200,
          statusText: "OK",
          data: { id: "preview-sent" },
        },
      },
    })
  );
  const sendEmail = createCloudflareManagedFormEmailSenderWithUrl(
    emailWorkerOrigin,
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
  expect(url.href).toBe(emailProcedureUrl);
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

test("sends Preview email to an approved Email Worker version URL", async () => {
  const versionUrl =
    "https://a1b2c3d4-webstudio-email-service.wstd.workers.dev";
  const fetcher = vi.fn(async (_input: RequestInfo | URL) =>
    Response.json({
      result: {
        data: {
          ok: true,
          status: 200,
          statusText: "OK",
          data: { id: "version-sent" },
        },
      },
    })
  );
  const sendEmail = createCloudflareManagedFormEmailSenderWithUrl(
    versionUrl,
    "worker-secret",
    new FormData(),
    projectId,
    fetcher
  )!;

  expect(await sendEmail(request, {})).toMatchObject({ ok: true, status: 200 });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(String(fetcher.mock.calls[0][0])).toBe(
    `${versionUrl}/trpc/email.send`
  );
});

test("Preview reports a rejected server credential with the failing action name", async () => {
  const fetcher = vi.fn(async () =>
    Response.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      { status: 401 }
    )
  );
  const sendEmail = createCloudflareManagedFormEmailSenderWithUrl(
    emailWorkerOrigin,
    "local-server-token",
    new FormData(),
    projectId,
    fetcher
  )!;

  const result = await sendEmail(request, {});

  expect(result).toMatchObject({
    ok: false,
    status: 401,
    statusText:
      "Team email: the email service rejected the Builder's credential. Check TRPC_SERVER_API_TOKEN on the Builder server.",
    data: {
      error: {
        code: "EMAIL_PREVIEW_AUTH_FAILED",
      },
    },
  });
  expect(JSON.stringify(result)).not.toContain("local-server-token");
});

test("Preview preserves the email service error code from tRPC", async () => {
  const fetcher = vi.fn(async () =>
    Response.json(
      {
        error: {
          message: "Email sending limit reached",
          code: -32029,
          data: { emailCode: "email_rate_limited" },
        },
      },
      { status: 429 }
    )
  );
  const sendEmail = createCloudflareManagedFormEmailSenderWithUrl(
    emailWorkerOrigin,
    "worker-secret",
    new FormData(),
    projectId,
    fetcher
  )!;

  expect(await sendEmail(request, {})).toMatchObject({
    ok: false,
    status: 429,
    data: {
      error: {
        code: "email_rate_limited",
        message: "Email sending limit reached",
      },
    },
  });
});

test("Preview preserves a delivery failure from a successful tRPC response", async () => {
  const delivery = {
    ok: false,
    status: 429,
    statusText: "Email sending limit reached",
    data: {
      error: {
        code: "email_rate_limited",
        message: "Email sending limit reached",
      },
    },
  };
  const fetcher = vi.fn(async () =>
    Response.json({ result: { data: delivery } })
  );
  const sendEmail = createCloudflareManagedFormEmailSenderWithUrl(
    emailWorkerOrigin,
    "worker-secret",
    new FormData(),
    projectId,
    fetcher
  )!;

  expect(await sendEmail(request, {})).toEqual(delivery);
});

test("does not create a Preview sender without both URL and token", () => {
  expect(
    createCloudflareManagedFormEmailSenderWithUrl(
      emailWorkerOrigin,
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

test("rejects insecure or credential-bearing email service origins", () => {
  for (const url of [
    "http://webstudio-email-service.wstd.workers.dev",
    "https://user:password@webstudio-email-service.wstd.workers.dev",
    "https://webstudio-email-service.wstd.workers.dev/prefix",
    "https://webstudio-email-service.wstd.workers.dev?token=secret",
    "https://webstudio-email-service.wstd.workers.dev#secret",
    "https://webstudio-email-service.wstd.workers.dev:8443",
    "https://apps.webstudio.is/v1/preview-send",
    "https://staging-webstudio-email-service.wstd.workers.dev",
    "https://abc-webstudio-email-service.wstd.workers.dev",
    "https://a1b2c3g4-webstudio-email-service.wstd.workers.dev",
    "https://a1b2c3d4-other-email-service.wstd.workers.dev",
    "https://a1b2c3d4-webstudio-email-service.other.workers.dev",
    "https://a1b2c3d4-webstudio-email-service.wstd.workers.dev/v1/send",
    "https://another-account.workers.dev",
  ]) {
    expect(() =>
      createCloudflareManagedFormEmailSenderWithUrl(
        url,
        "worker-secret",
        new FormData(),
        projectId
      )
    ).toThrow("approved Worker origin");
  }
});

test("keeps an address-only Reply-To without a display name", async () => {
  const rpc = successfulSend();
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
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
  const [, payload] = rpc.mock.calls[0];
  expect(payload).toMatchObject({
    replyTo: { address: "reply@example.com" },
  });
  expect(payload).not.toHaveProperty("fromName");
});

test("omits attachments when disabled and preserves worker errors", async () => {
  const formData = new FormData();
  formData.append("file", new File(["hello"], "hello.txt"));
  const rpc = vi.fn<EmailService["sendEmail"]>(async () => ({
    ok: false,
    status: 502,
    statusText: "Rejected",
    data: { error: { code: "EMAIL_REJECTED", message: "Rejected" } },
  }));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
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
  const [, payload] = rpc.mock.calls[0];
  expect(payload).not.toHaveProperty("attachments");
});

test("passes the Email Service per-site delivery limit back as a failed send", async () => {
  const rpc = vi.fn<EmailService["sendEmail"]>(async () => ({
    ok: false,
    status: 429,
    statusText: "Email sending limit reached",
    data: {
      error: {
        code: "email_rate_limited",
        message: "Email sending limit reached",
      },
    },
  }));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  )!;
  expect(await sendEmail(request, {})).toMatchObject({
    ok: false,
    status: 429,
    statusText: "Email sending limit reached",
    data: { error: { code: "email_rate_limited" } },
  });
  expect(rpc).toHaveBeenCalledOnce();
});

test.each([undefined, null, "", "   ", 123])(
  "treats malformed successful Email ID %s as a provider error",
  async (id) => {
    const rpc = vi.fn<EmailService["sendEmail"]>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      data: id === undefined ? {} : { id },
    } as unknown as Awaited<ReturnType<EmailService["sendEmail"]>>);
    const sendEmail = createCloudflareManagedFormEmailSender(
      { sendEmail: rpc },
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

test.each(["", "   "])("rejects blank legacy Email ID %j", async (id) => {
  const rpc = vi.fn<EmailService["sendEmail"]>().mockResolvedValue({ id });
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  )!;
  expect(await sendEmail(request, {})).toMatchObject({
    ok: false,
    status: 502,
    data: { error: { code: "EMAIL_SERVICE_ERROR" } },
  });
});

test.each([
  undefined,
  null,
  {},
  { code: 123, message: "Rejected" },
  { code: "REJECTED" },
])(
  "treats malformed failed RPC error %s as a provider error",
  async (error) => {
    const rpc = vi.fn<EmailService["sendEmail"]>().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Rejected",
      data: { error },
    } as unknown as Awaited<ReturnType<EmailService["sendEmail"]>>);
    const sendEmail = createCloudflareManagedFormEmailSender(
      { sendEmail: rpc },
      new FormData()
    )!;
    expect(await sendEmail(request, {})).toMatchObject({
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
  const rpc = vi.fn<EmailService["sendEmail"]>(async () => ({
    ok: false,
    status: 400,
    statusText: emailSettingsInvalidMessage,
    data: {
      error: { code: "EMAIL_INVALID", message: emailSettingsInvalidMessage },
    },
  }));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
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
    statusText: emailSettingsInvalidMessage,
    data: { error: { code: "EMAIL_INVALID" } },
  });
  expect(rpc).toHaveBeenCalledOnce();
});

test("does not send after cancellation", async () => {
  const rpc = successfulSend();
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  )!;
  const result = await sendEmail(request, { signal: AbortSignal.abort() });
  expect(result).toMatchObject({ ok: false, status: 499 });
  expect(rpc).not.toHaveBeenCalled();
});

test("times out a hanging RPC and cleans up its cancellation listener", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const removeListener = vi.spyOn(controller.signal, "removeEventListener");
  const rpc = vi.fn<EmailService["sendEmail"]>(() => new Promise(() => {}));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  )!;
  try {
    const pending = sendEmail(request, {
      timeoutMs: 20,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(20);
    expect(await pending).toMatchObject({
      ok: false,
      status: 504,
      data: { error: { code: "EMAIL_TIMEOUT" } },
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

test("cancels an in-flight RPC and ignores its later result", async () => {
  const controller = new AbortController();
  let finish!: (result: Awaited<ReturnType<EmailService["sendEmail"]>>) => void;
  let started!: () => void;
  const called = new Promise<void>((resolve) => {
    started = resolve;
  });
  const rpc = vi.fn<EmailService["sendEmail"]>(() => {
    started();
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  )!;
  const pending = sendEmail(request, { signal: controller.signal });
  await called;
  controller.abort();
  expect(await pending).toMatchObject({
    ok: false,
    status: 499,
    data: { error: { code: "EMAIL_CANCELLED" } },
  });
  finish({ ok: true, status: 200, data: { id: "too-late" } });
  expect(await pending).toMatchObject({ ok: false, status: 499 });
  expect(rpc).toHaveBeenCalledOnce();
});

test("reports a rejected RPC as an unavailable Email Service", async () => {
  const rpc = vi
    .fn<EmailService["sendEmail"]>()
    .mockRejectedValue(new Error("private failure"));
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  )!;
  expect(await sendEmail(request, {})).toMatchObject({
    ok: false,
    status: 502,
    data: { error: { code: "EMAIL_SERVICE_UNAVAILABLE" } },
  });
});

test.each(["rpc", "preview"] as const)(
  "%s normalizes legacy and canonical Email successes",
  async (transport) => {
    for (const reply of [
      { id: "sent" },
      { ok: true, status: 200, statusText: "OK", data: { id: "sent" } },
    ]) {
      const dispatch = vi.fn(async () => reply);
      const sendEmail =
        transport === "rpc"
          ? createCloudflareManagedFormEmailSender(
              { sendEmail: dispatch },
              new FormData()
            )!
          : createCloudflareManagedFormEmailSenderWithUrl(
              emailWorkerOrigin,
              "worker-secret",
              new FormData(),
              projectId,
              async () => Response.json({ result: { data: await dispatch() } })
            )!;
      expect(await sendEmail(request, {})).toEqual({
        ok: true,
        status: 200,
        statusText: "OK",
        data: "data" in reply ? reply.data : { id: reply.id },
      });
      expect(dispatch).toHaveBeenCalledOnce();
    }
  }
);

test.each(
  (["rpc", "preview"] as const).flatMap((transport) =>
    (["failure", "timeout", "malformed", "empty-id"] as const).map(
      (outcome) => ({
        transport,
        outcome,
      })
    )
  )
)(
  "$transport dispatches Email once after $outcome",
  async ({ transport, outcome }) => {
    vi.useFakeTimers();
    try {
      const dispatch = vi.fn(async () => {
        if (outcome === "timeout") {
          return new Promise<unknown>(() => {});
        }
        if (outcome === "failure") {
          throw new Error("Delivery may already have occurred");
        }
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          data: outcome === "empty-id" ? { id: "" } : {},
        };
      });
      const sendEmail =
        transport === "rpc"
          ? createCloudflareManagedFormEmailSender(
              { sendEmail: dispatch },
              new FormData()
            )!
          : createCloudflareManagedFormEmailSenderWithUrl(
              emailWorkerOrigin,
              "worker-secret",
              new FormData(),
              projectId,
              async (_input, init) => {
                // Fetch rejects when the sender's timeout aborts the request.
                const aborted = new Promise<never>((_resolve, reject) => {
                  init?.signal?.addEventListener("abort", () =>
                    reject(new Error("Aborted"))
                  );
                });
                const reply = await Promise.race([dispatch(), aborted]);
                return Response.json({ result: { data: reply } });
              }
            )!;
      const pending = loadManagedFormResources(
        vi.fn(),
        {
          rootIds: ["email"],
          resources: [
            {
              id: "email",
              outputName: "Email",
              control: "email",
              dependencies: [],
              createRequest: () => request,
            },
          ],
        },
        undefined,
        {
          sendEmail,
          timeoutMs: 10,
          shouldRetryFailedRoot: shouldRetryManagedFormDestination,
        }
      );
      await vi.advanceTimersByTimeAsync(10);
      expect(await pending).toMatchObject({
        Email: { ok: false, status: outcome === "timeout" ? 504 : 502 },
      });
      expect(dispatch).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  }
);

test("a managed HTTP action still retries after failure", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
    .mockResolvedValueOnce(Response.json({ recovered: true }));
  const results = await loadManagedFormResources(
    fetcher,
    {
      rootIds: ["http"],
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
      ],
    },
    undefined,
    { shouldRetryFailedRoot: shouldRetryManagedFormDestination }
  );
  expect(results).toMatchObject({
    HTTP: { ok: true, data: { recovered: true } },
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("a failed Email root is dispatched once and keeps sibling results", async () => {
  const rpc = vi
    .fn<EmailService["sendEmail"]>()
    .mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Unavailable",
      data: { error: { code: "UNAVAILABLE", message: "Unavailable" } },
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      data: { id: "sent" },
    });
  const sendEmail = createCloudflareManagedFormEmailSender(
    { sendEmail: rpc },
    new FormData()
  );
  const results = await loadResourcesWithEmail(
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
    { sendEmail, shouldRetryFailedRoot: shouldRetryManagedFormDestination }
  );
  expect(rpc).toHaveBeenCalledOnce();
  expect(results).toMatchObject({
    Email: { ok: false, status: 503 },
    HTTP: { ok: true },
  });
});

test.each(["New form submission", "Custom owner subject"])(
  "owner subject %s stays unchanged with a new message ID per submission",
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
      shouldRetryFailedRoot: shouldRetryManagedFormDestination,
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
    const messageIds = sendEmail.mock.calls.map(
      ([emailRequest]) => emailRequest.email!.headers?.["X-Message-ID"]
    );
    expect(subjects).toHaveLength(2);
    expect(subjects).toEqual([subject, subject]);
    expect(messageIds[0]).toHaveLength(16);
    expect(
      [...messageIds[0]!].every((character) =>
        "0123456789abcdef".includes(character)
      )
    ).toBe(true);
    expect(messageIds[1]).not.toBe(messageIds[0]);
  }
);

test("Email actions in one Form submission share the message ID", async () => {
  const sendEmail = vi.fn(async (_emailRequest: ResourceRequest) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    data: null,
  }));
  await loadManagedFormResources(
    vi.fn(),
    {
      rootIds: ["owner", "visitor"],
      resources: [
        {
          id: "owner",
          outputName: "Owner email",
          control: "email",
          dependencies: [],
          createRequest: () => ({
            ...request,
            email: {
              ...request.email!,
              subject: "New contact form submission",
            },
          }),
        },
        {
          id: "visitor",
          outputName: "Visitor email",
          control: "email",
          dependencies: [],
          createRequest: () => ({
            ...request,
            email: { ...request.email!, subject: "We received your message" },
          }),
        },
      ],
    },
    undefined,
    { sendEmail }
  );
  const requests = sendEmail.mock.calls.map(([emailRequest]) => emailRequest);
  expect(requests).toHaveLength(2);
  expect(requests[0]!.email?.subject).toBe("New contact form submission");
  expect(requests[1]!.email?.subject).toBe("We received your message");
  expect(requests[0]!.email?.headers?.["X-Message-ID"]).toBeTruthy();
  expect(requests[1]!.email?.headers?.["X-Message-ID"]).toBe(
    requests[0]!.email?.headers?.["X-Message-ID"]
  );
});

test.each([
  { name: "empty", subject: "" },
  { name: "too long", subject: "a".repeat(999) },
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

test("owner subject at the maximum length stays unchanged", async () => {
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
            email: { ...request.email!, subject: "a".repeat(998) },
          }),
        },
      ],
    },
    undefined,
    { sendEmail }
  );
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(sendEmail.mock.calls[0][0].email?.subject).toBe("a".repeat(998));
  expect(
    sendEmail.mock.calls[0][0].email?.headers?.["X-Message-ID"]
  ).toHaveLength(16);
});

test("oversize Email preflight stops both Email and HTTP destinations", async () => {
  const formData = new FormData();
  const file = new File([new Uint8Array(6 * 1024 * 1024)], "large.bin");
  const readFile = vi.spyOn(file, "arrayBuffer");
  formData.append("upload", file);
  const emailRpc = successfulSend();
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
        { sendEmail: emailRpc },
        formData
      ),
      validateEmail: (resource) =>
        validateCloudflareManagedFormEmail(resource, formData),
    })
  ).rejects.toThrow("Email attachments are too large to encode");
  expect(httpFetch).not.toHaveBeenCalled();
  expect(emailRpc).not.toHaveBeenCalled();
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
