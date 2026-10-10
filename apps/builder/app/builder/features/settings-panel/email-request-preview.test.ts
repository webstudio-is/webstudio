import { expect, test, vi } from "vitest";
import { encodeDataVariableId } from "@webstudio-is/sdk";
import { internalFormFieldNames } from "@webstudio-is/sdk/runtime";
import { buildEmailRequestPreview } from "./email-request-preview";

const managedFormDataSources = new Map([
  [
    "form-data",
    {
      id: "form-data",
      type: "parameter" as const,
      scopeInstanceId: "form",
      name: "formData",
    },
  ],
]);

test("Email Request preview uses current Form data and settings without sending", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  try {
    const preview = await buildEmailRequestPreview({
      settings: {},
      projectMeta: {
        contactEmail: "owner@example.com",
        emailSender: "Acme <sender@example.com>",
      },
      scope: {},
      aliases: new Map(),
      dataSources: managedFormDataSources,
      formId: "form",
      formData: {
        name: "Ada",
        email: "ada@example.com",
        upload: [
          {
            __webstudioPreviewFile: true,
            name: "sample.txt",
            type: "text/plain",
            size: 3,
          },
          {
            __webstudioPreviewFile: true,
            name: "",
            type: "application/octet-stream",
            size: 0,
          },
        ],
        ordinary: { name: "not-a-file", type: "text/plain", size: 7 },
        password: "hidden-password",
      },
      browserInfo: {
        ip: "",
        userAgent: "Example browser",
        language: "en",
        referrer: "",
      },
      instances: new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [{ type: "id", value: "password-input" }],
          },
        ],
        [
          "password-input",
          {
            id: "password-input",
            type: "instance",
            component: "Input",
            children: [],
          },
        ],
      ]),
      props: new Map([
        [
          "password-name",
          {
            id: "password-name",
            instanceId: "password-input",
            name: "name",
            type: "string",
            value: "password",
          },
        ],
        [
          "password-type",
          {
            id: "password-type",
            instanceId: "password-input",
            name: "type",
            type: "string",
            value: "password",
          },
        ],
      ]),
    });

    expect(preview.preview.to).toEqual([{ address: "owner@example.com" }]);
    expect(preview.preview.replyTo).toEqual({
      name: "Acme",
      address: "sender@example.com",
    });
    expect(preview.preview.text).toContain('"name": "Ada"');
    expect(preview.preview.text).toContain('"email": "ada@example.com"');
    expect(preview.preview.text).toContain('"sample.txt"');
    expect(preview.preview.text).not.toContain("hidden-password");
    expect(preview.preview.attachments).toEqual([
      { name: "sample.txt", type: "text/plain", size: 3 },
    ]);
    expect(JSON.stringify(preview)).not.toContain("contentBase64");
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

test("Visitor Email Request preview leaves missing addresses empty and never fabricates a send", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  try {
    const preview = await buildEmailRequestPreview({
      settings: {
        recipientMode: "visitor",
        visitorEmailField: "email",
        includeAttachments: false,
      },
      scope: {},
      aliases: new Map(),
      dataSources: managedFormDataSources,
      formId: "form",
      formData: {
        email: "",
        upload: [
          {
            __webstudioPreviewFile: true,
            name: "sample.txt",
            type: "text/plain",
            size: 3,
          },
        ],
      },
      instances: new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [],
          },
        ],
      ]),
      props: new Map(),
    });
    expect(preview.preview.to).toEqual([]);
    expect(preview.preview.text).toBe("");
    expect(preview.preview).not.toHaveProperty("attachments");
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

test.each(["name", "type"] as const)(
  "Email Request preview hides all Form values when an input has a dynamic %s",
  async (dynamicProp) => {
    const identifier = encodeDataVariableId("form-data");
    const internalName = [...internalFormFieldNames][0];
    const secretFormData = {
      password: "private-password",
      [internalName]: "private-bot-value",
      email: "visitor@example.com",
    };
    const preview = await buildEmailRequestPreview({
      settings: {
        body: `(${identifier}.password ?? "") + (${identifier}[${JSON.stringify(internalName)}] ?? "")`,
      },
      projectMeta: { contactEmail: "owner@example.com" },
      scope: { [identifier]: secretFormData },
      aliases: new Map([[identifier, "formData"]]),
      dataSources: managedFormDataSources,
      formId: "form",
      formData: secretFormData,
      instances: new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [{ type: "id", value: "input" }],
          },
        ],
        [
          "input",
          {
            id: "input",
            type: "instance",
            component: "Input",
            children: [],
          },
        ],
      ]),
      props: new Map([
        [
          "input-name",
          {
            id: "input-name",
            instanceId: "input",
            name: "name",
            type: dynamicProp === "name" ? "expression" : "string",
            value: "password",
          },
        ],
        [
          "input-type",
          {
            id: "input-type",
            instanceId: "input",
            name: "type",
            type: dynamicProp === "type" ? "expression" : "string",
            value: "password",
          },
        ],
      ]),
    });
    expect(preview.preview.text).toBe("");
    expect(JSON.stringify(preview)).not.toContain("private-password");
    expect(JSON.stringify(preview)).not.toContain("private-bot-value");
    expect(JSON.stringify(preview)).not.toContain("visitor@example.com");
  }
);

test("Email Request preview blocks explicit access to known password and internal fields", async () => {
  const identifier = encodeDataVariableId("form-data");
  const internalName = [...internalFormFieldNames][0];
  const preview = await buildEmailRequestPreview({
    settings: {
      body: `(${identifier}.password ?? "") + (${identifier}[${JSON.stringify(internalName)}] ?? "")`,
    },
    scope: {
      [identifier]: {
        password: "private-password",
        [internalName]: "private-bot-value",
      },
    },
    aliases: new Map([[identifier, "formData"]]),
    dataSources: managedFormDataSources,
    formId: "form",
    formData: {
      password: "private-password",
      [internalName]: "private-bot-value",
    },
    instances: new Map([
      [
        "form",
        {
          id: "form",
          type: "instance",
          component: "NativeForm",
          children: [{ type: "id", value: "password-input" }],
        },
      ],
      [
        "password-input",
        {
          id: "password-input",
          type: "instance",
          component: "Input",
          children: [],
        },
      ],
    ]),
    props: new Map([
      [
        "password-name",
        {
          id: "password-name",
          instanceId: "password-input",
          name: "name",
          type: "string",
          value: "password",
        },
      ],
      [
        "password-type",
        {
          id: "password-type",
          instanceId: "password-input",
          name: "type",
          type: "string",
          value: "password",
        },
      ],
    ]),
  });
  expect(preview.preview.text).toBe("");
  expect(JSON.stringify(preview)).not.toContain("private-password");
  expect(JSON.stringify(preview)).not.toContain("private-bot-value");
});

test("Email Request preview does not fall back to scoped Form data when current values are missing", async () => {
  const identifier = encodeDataVariableId("form-data");
  const preview = await buildEmailRequestPreview({
    settings: { body: `${identifier}.password ?? ""` },
    scope: { [identifier]: { password: "private-password" } },
    aliases: new Map([[identifier, "formData"]]),
    dataSources: managedFormDataSources,
    formId: "form",
    instances: new Map([
      [
        "form",
        {
          id: "form",
          type: "instance",
          component: "NativeForm",
          children: [],
        },
      ],
    ]),
    props: new Map(),
  });
  expect(preview.preview.text).toBe("");
  expect(JSON.stringify(preview)).not.toContain("private-password");
});

test("Email Request preview preserves user variables named like managed Form parameters", async () => {
  const userFormData = encodeDataVariableId("user-form-data");
  const userBrowserInfo = encodeDataVariableId("user-browser-info");
  const managedFormData = encodeDataVariableId("form-data");
  const preview = await buildEmailRequestPreview({
    settings: {
      body: `${userFormData}.label + ":" + ${userBrowserInfo}.label + ":" + ${managedFormData}.email`,
    },
    scope: {
      [userFormData]: { label: "user-form" },
      [userBrowserInfo]: { label: "user-browser" },
      [managedFormData]: { email: "stale@example.com" },
    },
    aliases: new Map([
      [userFormData, "formData"],
      [userBrowserInfo, "browserInfo"],
      [managedFormData, "formData"],
    ]),
    dataSources: managedFormDataSources,
    formId: "form",
    formData: { email: "current@example.com" },
    instances: new Map([
      [
        "form",
        {
          id: "form",
          type: "instance",
          component: "NativeForm",
          children: [],
        },
      ],
    ]),
    props: new Map(),
  });

  expect(preview.preview.text).toBe(
    "user-form:user-browser:current@example.com"
  );
});
