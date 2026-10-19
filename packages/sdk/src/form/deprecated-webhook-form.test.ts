import { expect, test, vi } from "vitest";
import type { ResourceRequestGraph } from "../resource-loader";
import type { ResourceRequest } from "../schema/resources";
import { handleDeprecatedWebhookFormSubmission } from "./deprecated-webhook-form";
import { formBotFieldName, formIdFieldName } from "./fields";

const url = new URL("https://site.example/contact");
const resourceFetch = Object.assign(
  vi.fn(async () => Response.json({ accepted: true })),
  { validateDestination: vi.fn() }
);
const submit = (
  options: Partial<Parameters<typeof handleDeprecatedWebhookFormSubmission>[0]> = {}
) => {
  const formData = new FormData();
  formData.set(formBotFieldName, "brave");
  formData.set("message", "Hello");
  return handleDeprecatedWebhookFormSubmission({
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

test.each(["get", "post", "put", "delete"] as const)(
  "keeps the deprecated Webhook Form %s method, request fields, and last repeated value",
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
            bodyFormat: "json",
            body: "saved body",
          }),
        },
        {
          id: "dependency",
          outputName: "dependency",
          dependencies: [],
          createRequest: () => ({
            name: "dependency",
            method: "post",
            body: { lookup: "saved" },
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
    const dependencyFetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(await new Response(init?.body).json()).toEqual({
          lookup: "saved",
        });
        return Response.json("saved");
      }
    );
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
    ).rejects.toThrow(
      kind === "missing" ? "Form Resource absent not found" : "cycle"
    );
    expect(createRequest).not.toHaveBeenCalled();
  }
);
