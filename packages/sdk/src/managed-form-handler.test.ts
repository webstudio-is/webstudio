import { expect, test, vi } from "vitest";
import { handleManagedFormSubmission } from "./managed-form-handler";
import {
  formBotFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./form-fields";

test("the shared handler executes a Form graph from the supplied runtime configuration", async () => {
  const data = new FormData();
  data.set(managedFormIdFieldName, "form");
  data.set(managedFormArrayNamesFieldName, '["interests"]');
  data.set(formBotFieldName, Date.now().toString(16));
  data.append("interests", "design");
  data.append("interests", "code");
  const request = new Request("https://site.example/contact", {
    method: "POST",
    body: data,
  });
  const resourceFetch = vi.fn(async () =>
    Response.json({ accepted: true }, { status: 201 })
  );
  const getGraph = vi.fn((_id: string, values: { formData: unknown }) => ({
    resources: [
      {
        id: "http",
        outputName: "http",
        dependencies: [],
        createRequest: () => ({
          name: "Webhook",
          method: "post" as const,
          url: "https://api.example/submit",
          headers: [],
          searchParams: [],
          body: values.formData,
        }),
      },
    ],
    rootIds: ["http"],
  }));
  const result = await handleManagedFormSubmission({
    request,
    system: {
      origin: "https://site.example",
      pathname: "/contact",
      params: {},
      search: {},
    },
    configuration: () => ({
      action: [{ dataSourceId: "source", enabled: true }],
      resourceIds: ["http"],
    }),
    getGraph,
    resourceFetch,
  });
  expect(getGraph).toHaveBeenCalledWith(
    "form",
    expect.objectContaining({
      formData: { interests: ["design", "code"] },
    })
  );
  expect(resourceFetch).toHaveBeenCalledTimes(1);
  expect(result).toEqual({
    success: true,
    status: 200,
    results: [
      {
        resourceId: "http",
        resourceName: expect.any(String),
        status: 201,
        body: { accepted: true },
      },
    ],
    errors: [],
  });
});

test("three webhooks complete when the Email Service rate-limits one destination", async () => {
  const data = new FormData();
  data.set(managedFormIdFieldName, "form");
  data.set(managedFormArrayNamesFieldName, "[]");
  data.set(formBotFieldName, Date.now().toString(16));
  const request = new Request("https://site.example/contact", {
    method: "POST",
    body: data,
  });
  const resourceFetch = vi.fn(async (_input: RequestInfo | URL) =>
    Response.json({ accepted: true }, { status: 201 })
  );
  const sendEmail = vi.fn(async () => ({
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
  const webhookIds = ["webhook-1", "webhook-2", "webhook-3"];
  const graph = {
    rootIds: [...webhookIds, "email"],
    resources: [
      ...webhookIds.map((id) => ({
        id,
        outputName: id,
        dependencies: [],
        createRequest: () => ({
          name: id,
          method: "post" as const,
          url: `https://api.example/${id}`,
          headers: [],
          searchParams: [],
          body: { value: "submitted" },
        }),
      })),
      {
        id: "email",
        outputName: "email",
        dependencies: [],
        control: "email" as const,
        emailRecipientCount: 1,
        createRequest: () => ({
          name: "Team email",
          control: "email" as const,
          method: "post" as const,
          url: "",
          headers: [],
          searchParams: [],
          email: {
            recipientMode: "project" as const,
            recipients: [{ address: "team@example.com", name: "Team" }],
            subject: "New submission",
            body: "Submitted",
            includeAttachments: false,
          },
        }),
      },
    ],
  };
  const result = await handleManagedFormSubmission({
    request,
    system: {
      origin: "https://site.example",
      pathname: "/contact",
      params: {},
      search: {},
    },
    configuration: () => ({
      action: graph.rootIds.map((dataSourceId) => ({
        dataSourceId,
        enabled: true,
      })),
      resourceIds: graph.rootIds,
    }),
    getGraph: () => graph,
    createEmailSender: () => sendEmail,
    resourceFetch,
  });
  expect(resourceFetch).toHaveBeenCalledTimes(3);
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(result).toMatchObject({
    success: false,
    status: 502,
    results: [
      { resourceId: "webhook-1", status: 201 },
      { resourceId: "webhook-2", status: 201 },
      { resourceId: "webhook-3", status: 201 },
      {
        resourceId: "email",
        resourceName: expect.any(String),
        status: 429,
        body: { error: { code: "email_rate_limited" } },
      },
    ],
    errors: [
      {
        resourceId: "email",
        status: 429,
        message: "Email sending limit reached",
      },
    ],
  });
});

test("a visitor Email Resource sends in parallel and a failed delivery remains nonfatal", async () => {
  const data = new FormData();
  data.set(managedFormIdFieldName, "form");
  data.set(managedFormArrayNamesFieldName, "[]");
  data.set(formBotFieldName, "brave");
  data.set("email", "visitor@example.com");
  const resourceFetch = vi.fn(async () =>
    Response.json({ accepted: true }, { status: 201 })
  );
  const sendEmail = vi.fn(async (request) => {
    expect(request.email).toMatchObject({
      recipients: [{ address: "visitor@example.com" }],
      body: "We received your request from https://site.example.",
      includeAttachments: false,
    });
    return {
      ok: false,
      status: 429,
      statusText: "Email sending limit reached",
      data: { error: { code: "email_rate_limited" } },
    };
  });
  const result = await handleManagedFormSubmission({
    request: new Request("https://site.example/contact", {
      method: "POST",
      body: data,
    }),
    system: {
      origin: "https://site.example",
      pathname: "/contact",
      params: {},
      search: {},
    },
    configuration: () => ({
      action: [
        { dataSourceId: "http", enabled: true },
        { dataSourceId: "visitor", enabled: true },
      ],
      resourceIds: ["http", "visitor"],
    }),
    getGraph: () => ({
      rootIds: ["http", "visitor"],
      resources: [
        {
          id: "http",
          outputName: "http",
          dependencies: [],
          createRequest: () => ({
            name: "Webhook",
            method: "post",
            url: "https://api.example/submit",
            headers: [],
            searchParams: [],
          }),
        },
        {
          id: "visitor",
          outputName: "visitor",
          dependencies: [],
          control: "email",
          emailRecipientCount: 1,
          nonfatal: true,
          createRequest: () => ({
            name: "Receipt",
            control: "email",
            method: "post",
            url: "",
            headers: [],
            searchParams: [],
            email: {
              recipientMode: "visitor",
              visitorEmailField: "email",
              recipients: [],
              subject: "Received",
              body: "",
              includeAttachments: false,
            },
          }),
        },
      ],
    }),
    createEmailSender: () => sendEmail,
    resourceFetch,
  });
  expect(resourceFetch).toHaveBeenCalledOnce();
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(result).toMatchObject({
    success: true,
    status: 200,
    results: [
      { resourceId: "http", status: 201 },
      { resourceId: "visitor", status: 429 },
    ],
    errors: [
      {
        resourceId: "visitor",
        status: 429,
        message: "Email sending limit reached",
      },
    ],
  });
});

test("two visitor Email Resources fail preflight before any action runs", async () => {
  const data = new FormData();
  data.set(managedFormIdFieldName, "form");
  data.set(managedFormArrayNamesFieldName, "[]");
  data.set(formBotFieldName, "brave");
  data.set("email", "visitor@example.com");
  const resourceFetch = vi.fn();
  const sendEmail = vi.fn();
  const createEmailSender = vi.fn(() => sendEmail);
  const resourceIds = ["webhook", "visitor-1", "visitor-2"];
  const visitor = (id: string) => ({
    id,
    outputName: id,
    dependencies: [],
    control: "email" as const,
    emailRecipientCount: 1,
    nonfatal: true,
    createRequest: () => ({
      name: "Receipt",
      control: "email" as const,
      method: "post" as const,
      url: "",
      headers: [],
      searchParams: [],
      email: {
        recipientMode: "visitor" as const,
        visitorEmailField: "email",
        recipients: [],
        subject: "Received",
        body: "",
        includeAttachments: false,
      },
    }),
  });

  await expect(
    handleManagedFormSubmission({
      request: new Request("https://site.example/contact", {
        method: "POST",
        body: data,
      }),
      system: {
        origin: "https://site.example",
        pathname: "/contact",
        params: {},
        search: {},
      },
      configuration: () => ({
        action: resourceIds.map((dataSourceId) => ({
          dataSourceId,
          enabled: true,
        })),
        resourceIds,
      }),
      getGraph: () => ({
        rootIds: resourceIds,
        resources: [
          {
            id: "webhook",
            outputName: "webhook",
            dependencies: [],
            createRequest: () => ({
              name: "Webhook",
              method: "post" as const,
              url: "https://api.example/submit",
              headers: [],
              searchParams: [],
            }),
          },
          visitor("visitor-1"),
          visitor("visitor-2"),
        ],
      }),
      createEmailSender,
      resourceFetch,
    })
  ).rejects.toThrow(
    "Select no more than one visitor Email Resource per Form submission"
  );
  expect(createEmailSender).not.toHaveBeenCalled();
  expect(resourceFetch).not.toHaveBeenCalled();
  expect(sendEmail).not.toHaveBeenCalled();
});

test.each([undefined, "invalid-address"])(
  "an invalid visitor address %s fails only its Email action",
  async (address) => {
    const data = new FormData();
    data.set(managedFormIdFieldName, "form");
    data.set(managedFormArrayNamesFieldName, "[]");
    data.set(formBotFieldName, "brave");
    if (address !== undefined) {
      data.set("email", address);
    }
    const resourceFetch = vi.fn(async () =>
      Response.json({ accepted: true }, { status: 201 })
    );
    const sendEmail = vi.fn();
    const result = await handleManagedFormSubmission({
      request: new Request("https://site.example/contact", {
        method: "POST",
        body: data,
      }),
      system: {
        origin: "https://site.example",
        pathname: "/contact",
        params: {},
        search: {},
      },
      configuration: () => ({
        action: [
          { dataSourceId: "http", enabled: true },
          { dataSourceId: "visitor", enabled: true },
        ],
        resourceIds: ["http", "visitor"],
      }),
      getGraph: () => ({
        rootIds: ["http", "visitor"],
        resources: [
          {
            id: "http",
            outputName: "http",
            dependencies: [],
            createRequest: () => ({
              name: "Webhook",
              method: "post",
              url: "https://api.example/submit",
              headers: [],
              searchParams: [],
            }),
          },
          {
            id: "visitor",
            outputName: "visitor",
            dependencies: [],
            control: "email",
            emailRecipientCount: 1,
            nonfatal: true,
            createRequest: () => ({
              name: "Receipt",
              control: "email",
              method: "post",
              url: "",
              headers: [],
              searchParams: [],
              email: {
                recipientMode: "visitor",
                visitorEmailField: "email",
                recipients: [],
                subject: "Received",
                body: "",
                includeAttachments: false,
              },
            }),
          },
        ],
      }),
      createEmailSender: () => sendEmail,
      resourceFetch,
    });
    expect(resourceFetch).toHaveBeenCalledOnce();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      status: 200,
      results: [
        { resourceId: "http", status: 201 },
        {
          resourceId: "visitor",
          resourceName: expect.any(String),
          status: 400,
          body: { error: { code: "invalid_visitor_email" } },
        },
      ],
      errors: [
        {
          resourceId: "visitor",
          status: 400,
          message: "Visitor email requires one valid email field",
        },
      ],
    });
  }
);

test.each([
  "subject",
  "expression",
  "field",
  "provider-validation",
  "body-format",
  "unconfigured",
  "dependency",
  "selected-dependency",
])(
  "visitor Email %s failure preserves HTTP siblings and its ordered result",
  async (failure) => {
    const data = new FormData();
    data.set(managedFormIdFieldName, "form");
    data.set(managedFormArrayNamesFieldName, "[]");
    data.set(formBotFieldName, Date.now().toString(16));
    data.set("email", "visitor@example.com");
    const resourceFetch = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({ accepted: true }, { status: 201 })
    );
    const sendEmail = vi.fn();
    const result = await handleManagedFormSubmission({
      request: new Request("https://site.example", {
        method: "POST",
        body: data,
      }),
      system: {
        params: {},
        search: {},
        origin: "https://site.example",
        pathname: "/",
      },
      configuration: () => ({
        action: [
          { dataSourceId: "visitor", enabled: true },
          { dataSourceId: "http", enabled: true },
        ],
        resourceIds: ["visitor", "http"],
      }),
      getGraph: () => ({
        rootIds: ["visitor", "http"],
        resources: [
          {
            id: "http",
            outputName: "http",
            dependencies: [],
            createRequest: () => ({
              name: "HTTP",
              url: "https://api.example",
              method: "post",
              headers: [],
              searchParams: [],
            }),
          },
          {
            id: "visitor",
            outputName: "visitor",
            dependencies:
              failure === "dependency"
                ? ["lookup"]
                : failure === "selected-dependency"
                  ? ["http"]
                  : [],
            control: "email",
            nonfatal: true,
            emailRecipientCount: 1,
            createRequest: () => {
              if (failure === "expression") {
                throw new Error("Invalid body expression");
              }
              return {
                name: "Receipt",
                url: "",
                method: "post",
                headers: [],
                searchParams: [],
                control: "email",
                ...(failure === "body-format"
                  ? {
                      bodyFormat: "json" as const,
                      body: "irrelevant HTTP body",
                    }
                  : {}),
                email: {
                  recipientMode: "visitor",
                  visitorEmailField: failure === "field" ? undefined : "email",
                  recipients: [],
                  subject:
                    failure === "subject" || failure === "body-format"
                      ? "Invalid\nsubject"
                      : "Receipt",
                  body: "",
                  includeAttachments: false,
                },
              };
            },
          },
          {
            id: "lookup",
            outputName: "lookup",
            dependencies: [],
            createRequest: () => ({
              name: "Lookup",
              url: "https://api.example/lookup",
              method: "get",
              headers: [],
              searchParams: [],
            }),
          },
        ],
      }),
      resourceFetch,
      createEmailSender:
        failure === "unconfigured" ? undefined : () => sendEmail,
      validateEmail: () => {
        if (failure === "provider-validation") {
          throw new Error("Email content is too large");
        }
      },
    });
    expect(result).toMatchObject({
      success: true,
      status: 200,
      results: [
        { resourceId: "visitor", status: 400 },
        { resourceId: "http", status: 201 },
      ],
      errors: [{ resourceId: "visitor", status: 400 }],
    });
    expect(resourceFetch).toHaveBeenCalledOnce();
    expect(resourceFetch.mock.calls[0][0]).toBe("https://api.example/");
    expect(sendEmail).not.toHaveBeenCalled();
  }
);

test.each([false, true])(
  "a selected HTTP Action cannot depend on a selected visitor Email, including invalid visitor input (%s)",
  async (invalidVisitor) => {
    const data = new FormData();
    data.set(managedFormIdFieldName, "form");
    data.set(managedFormArrayNamesFieldName, "[]");
    data.set(formBotFieldName, Date.now().toString(16));
    data.set("email", invalidVisitor ? "invalid" : "visitor@example.com");
    const resourceFetch = vi.fn();
    const sendEmail = vi.fn();
    await expect(
      handleManagedFormSubmission({
        request: new Request("https://site.example", {
          method: "POST",
          body: data,
        }),
        system: {
          params: {},
          search: {},
          origin: "https://site.example",
          pathname: "/",
        },
        configuration: () => ({
          action: [
            { dataSourceId: "http", enabled: true },
            { dataSourceId: "visitor", enabled: true },
          ],
          resourceIds: ["http", "visitor"],
        }),
        getGraph: () => ({
          rootIds: ["http", "visitor"],
          resources: [
            {
              id: "http",
              outputName: "http",
              dependencies: ["visitor"],
              createRequest: () => ({
                name: "HTTP",
                url: "https://api.example",
                method: "post",
                headers: [],
                searchParams: [],
              }),
            },
            {
              id: "visitor",
              outputName: "visitor",
              dependencies: [],
              control: "email",
              nonfatal: true,
              emailRecipientCount: 1,
              createRequest: () => ({
                name: "Receipt",
                url: "",
                method: "post",
                headers: [],
                searchParams: [],
                control: "email",
                email: {
                  recipientMode: "visitor",
                  visitorEmailField: "email",
                  recipients: [],
                  subject: "Receipt",
                  body: "",
                  includeAttachments: false,
                },
              }),
            },
          ],
        }),
        resourceFetch,
        createEmailSender: () => sendEmail,
      })
    ).rejects.toThrow("Selected Form Resources cannot depend on one another");
    expect(resourceFetch).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  }
);
