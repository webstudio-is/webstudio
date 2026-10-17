import { expect, test, vi } from "vitest";
import type { ResourceRequestGraph } from "../resource-loader";
import type { ResourceRequest } from "../schema/resources";
import { handleLegacyWebhookFormSubmission } from "./legacy-webhook-form";
import { formBotFieldName, formIdFieldName } from "./fields";

const url = new URL("https://site.example/contact");
const resourceFetch = Object.assign(
  vi.fn(async () => Response.json({ accepted: true })),
  { validateDestination: vi.fn() }
);
const submit = (
  options: Partial<Parameters<typeof handleLegacyWebhookFormSubmission>[0]> = {}
) => {
  const formData = new FormData();
  formData.set(formBotFieldName, "brave");
  formData.set("message", "Hello");
  return handleLegacyWebhookFormSubmission({
    request: new Request(url),
    formData,
    url,
    resources: { data: { rootIds: [], resources: [] }, action: new Map() },
    contactEmail: "owner@example.com",
    resourceFetch,
    dependencyFetch: vi.fn(),
    createEmailSender: () => undefined,
    validateEmail: () => {},
    ...options,
  });
};

const emailRequest = (addresses: string[]): ResourceRequest => ({
  name: "Email",
  control: "email",
  method: "post",
  url: "",
  searchParams: [],
  headers: [],
  email: {
    recipientMode: "custom",
    recipients: addresses.map((address) => ({ address })),
    subject: "Hello",
    body: "Saved message",
    includeAttachments: false,
  },
});
const configuredEmail = (request: ResourceRequest) => ({
  data: {
    rootIds: [],
    resources: [
      {
        id: "email",
        outputName: "email",
        dependencies: [],
        control: "email" as const,
        createRequest: () => request,
      },
    ],
  },
  action: new Map([["email", { id: "email", outputName: "email" }]]),
});

test.each(["get", "post", "put", "delete"] as const)(
  "keeps the legacy %s method, request fields, and last repeated value",
  async (method) => {
    const formData = new FormData();
    formData.set(formIdFieldName, "action");
    formData.set(formBotFieldName, "brave");
    formData.append("choice", "first");
    formData.append("choice", "last");
    const data: ResourceRequestGraph = {
      rootIds: [],
      resources: [
        {
          id: "action",
          outputName: "action",
          dependencies: ["dependency"],
          createRequest: (documents) => ({
            name: "action",
            method,
            url: "https://receiver.example/",
            searchParams: [
              {
                name: "source",
                value: (documents.get("dependency") as { data: unknown }).data,
              },
            ],
            headers: [{ name: "X-Saved", value: "yes" }],
            body: "saved body",
          }),
        },
        {
          id: "dependency",
          outputName: "dependency",
          dependencies: [],
          createRequest: () => ({
            name: "dependency",
            method: "get",
            url: "/$resources/assets",
            searchParams: [],
            headers: [],
          }),
        },
        {
          id: "unrelated",
          outputName: "unrelated",
          dependencies: [],
          createRequest: () => {
            throw new Error("Unrelated Resource must not run");
          },
        },
        {
          id: "unrelated-email",
          outputName: "unrelated-email",
          control: "email",
          dependencies: [],
          createRequest: () => {
            throw new Error("Unrelated Email Resource must not run");
          },
        },
      ],
    };
    const rootFetch = Object.assign(
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        expect(request.method).toBe(method.toUpperCase());
        expect(request.headers.get("X-Saved")).toBe("yes");
        expect(new URL(request.url).searchParams.get("source")).toBe("saved");
        if (method !== "get") {
          expect(await request.json()).toEqual({ choice: "last" });
        }
        return Response.json({ accepted: true });
      }),
      { validateDestination: vi.fn() }
    );
    const dependencyFetch = vi.fn(async () => Response.json("saved"));
    expect(
      await submit({
        formData,
        resources: {
          data,
          action: new Map([["action", { id: "action", outputName: "action" }]]),
        },
        resourceFetch: rootFetch,
        dependencyFetch,
      })
    ).toEqual({ success: true });
    expect(rootFetch).toHaveBeenCalledOnce();
    expect(dependencyFetch).toHaveBeenCalledOnce();
  }
);

test("sends the default owner notification with fields and uploaded files", async () => {
  const formData = new FormData();
  formData.set(formBotFieldName, "brave");
  formData.set("message", "Hello");
  formData.set("attachment", new File(["file bytes"], "hello.txt"));
  const sendEmail = vi.fn(async (_request: ResourceRequest) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    data: { id: "sent" },
  }));
  const createEmailSender = vi.fn((submitted: FormData) => {
    expect(submitted.has(formBotFieldName)).toBe(false);
    expect(submitted.get("attachment")).toBeInstanceOf(File);
    return sendEmail;
  });
  expect(await submit({ formData, createEmailSender })).toEqual({
    success: true,
  });
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(sendEmail.mock.calls[0]?.[0]).toMatchObject({
    control: "email",
    email: {
      recipients: [{ address: "owner@example.com" }],
      subject: "New form submission from site.example",
      body: "There has been a new submission of your form at https://site.example/contact:\n\nmessage: Hello\n",
      includeAttachments: true,
    },
  });
});

test("preflights configured Email actions and supplies their threading header", async () => {
  const formData = new FormData();
  formData.set(formBotFieldName, "brave");
  formData.set(formIdFieldName, "email");
  const sendEmail = vi.fn(async (_request: ResourceRequest) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    data: { id: "sent" },
  }));
  const validateEmail = vi.fn();
  expect(
    await submit({
      formData,
      resources: configuredEmail(emailRequest(["visitor@example.com"])),
      createEmailSender: () => sendEmail,
      validateEmail,
    })
  ).toEqual({ success: true });
  expect(validateEmail).toHaveBeenCalledOnce();
  const sent = sendEmail.mock.calls[0]?.[0];
  expect(sent?.email?.headers?.["X-Message-ID"]).toEqual(expect.any(String));
  expect(validateEmail.mock.calls[0]?.[0]).toEqual(sent);
});

test("rejects too many configured Email recipients before sending", async () => {
  const formData = new FormData();
  formData.set(formBotFieldName, "brave");
  formData.set(formIdFieldName, "email");
  const createEmailSender = vi.fn();
  await expect(
    submit({
      formData,
      resources: configuredEmail(
        emailRequest(
          Array.from({ length: 6 }, (_, index) => `person${index}@example.com`)
        )
      ),
      createEmailSender,
    })
  ).rejects.toThrow("no more than 5");
  expect(createEmailSender).not.toHaveBeenCalled();
});

test("reports a failed Email action and does not retry it", async () => {
  const sendEmail = vi.fn(async (_request: ResourceRequest) => ({
    ok: false,
    status: 503,
    statusText: "Email unavailable",
    data: {},
  }));
  expect(await submit({ createEmailSender: () => sendEmail })).toEqual({
    success: false,
    errors: ["Email unavailable"],
  });
  expect(sendEmail).toHaveBeenCalledOnce();
});

test("rejects missing bot protection before constructing an email sender", async () => {
  const createEmailSender = vi.fn();
  await expect(
    submit({ formData: new FormData(), createEmailSender })
  ).rejects.toThrow();
  expect(createEmailSender).not.toHaveBeenCalled();
});

test.each(["missing", "cycle"] as const)(
  "rejects a %s dependency before dispatch",
  async (kind) => {
    const formData = new FormData();
    formData.set(formBotFieldName, "brave");
    formData.set(formIdFieldName, "action");
    const createRequest = vi.fn(() => ({
      name: "Resource",
      method: "post" as const,
      url: "https://receiver.example/",
      searchParams: [],
      headers: [],
    }));
    await expect(
      submit({
        formData,
        resources: {
          action: new Map([["action", { id: "action", outputName: "action" }]]),
          data: {
            rootIds: [],
            resources: [
              {
                id: "action",
                outputName: "action",
                dependencies: ["dependency"],
                createRequest,
              },
              {
                id: "dependency",
                outputName: "dependency",
                dependencies: [kind === "missing" ? "absent" : "dependency"],
                createRequest,
              },
            ],
          },
        },
      })
    ).rejects.toThrow(kind === "missing" ? "Resource not found" : "cycle");
    expect(createRequest).not.toHaveBeenCalled();
  }
);
