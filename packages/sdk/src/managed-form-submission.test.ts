import { expect, test, vi } from "vitest";
import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./form-fields";
import {
  getManagedFormBrowserInfo,
  getManagedFormValues,
  readFormDataWithLimit,
  validateManagedFormBot,
  validateManagedFormBodyFormats,
  validateManagedFormRecipientLimit,
} from "./managed-form-submission";
import { loadResources } from "./resource-loader";

test("allows five team deliveries across Email Resources and counts duplicate recipients", () => {
  const graph = {
    rootIds: ["project-email", "custom-email", "http"],
    resources: [
      {
        id: "project-email",
        outputName: "Project email",
        dependencies: [],
        control: "email" as const,
        emailRecipientCount: 2,
        createRequest: vi.fn(),
      },
      {
        id: "custom-email",
        outputName: "Custom email",
        dependencies: [],
        control: "email" as const,
        // Includes a recipient also listed in the project email.
        emailRecipientCount: 3,
        createRequest: vi.fn(),
      },
      {
        id: "http",
        outputName: "HTTP",
        dependencies: [],
        createRequest: vi.fn(),
      },
    ],
  };
  expect(() => validateManagedFormRecipientLimit(graph)).not.toThrow();
  for (const resource of graph.resources) {
    expect(resource.createRequest).not.toHaveBeenCalled();
  }
});

test("rejects six team deliveries before any HTTP or Email destination runs", () => {
  const httpRequest = vi.fn();
  const emailRequest = vi.fn();
  const graph = {
    rootIds: ["http", "first-email", "second-email"],
    resources: [
      {
        id: "http",
        outputName: "HTTP",
        dependencies: [],
        createRequest: httpRequest,
      },
      {
        id: "first-email",
        outputName: "First email",
        dependencies: [],
        control: "email" as const,
        emailRecipientCount: 3,
        createRequest: emailRequest,
      },
      {
        id: "second-email",
        outputName: "Second email",
        dependencies: [],
        control: "email" as const,
        emailRecipientCount: 3,
        createRequest: emailRequest,
      },
    ],
  };
  expect(() => validateManagedFormRecipientLimit(graph)).toThrow(
    "Select no more than 5 team email recipients"
  );
  expect(httpRequest).not.toHaveBeenCalled();
  expect(emailRequest).not.toHaveBeenCalled();
});

test("rejects Email roots without a trusted recipient count", () => {
  expect(() =>
    validateManagedFormRecipientLimit({
      rootIds: ["email"],
      resources: [
        {
          id: "email",
          outputName: "Email",
          dependencies: [],
          control: "email",
          createRequest: vi.fn(),
        },
      ],
    })
  ).toThrow("Invalid Email Resource recipient count");
});

test("rejects an Email Resource with no resolved recipient", () => {
  expect(() =>
    validateManagedFormRecipientLimit({
      rootIds: ["email"],
      resources: [
        {
          id: "email",
          outputName: "Email",
          dependencies: [],
          control: "email",
          emailRecipientCount: 0,
          createRequest: vi.fn(),
        },
      ],
    })
  ).toThrow("Invalid Email Resource recipient count");
});

test("counts Email dependencies once and blocks an HTTP root before side effects", () => {
  const httpRequest = vi.fn();
  const emailRequest = vi.fn();
  const emailResource = {
    id: "email",
    outputName: "Email",
    dependencies: [],
    control: "email" as const,
    emailRecipientCount: 6,
    createRequest: emailRequest,
  };
  const graph = {
    rootIds: ["http", "other-http"],
    resources: [
      {
        id: "http",
        outputName: "HTTP",
        dependencies: ["email"],
        createRequest: httpRequest,
      },
      {
        id: "other-http",
        outputName: "Other HTTP",
        dependencies: ["email"],
        createRequest: httpRequest,
      },
      emailResource,
    ],
  };
  expect(() => validateManagedFormRecipientLimit(graph)).toThrow(
    "Select no more than 5 team email recipients"
  );
  expect(httpRequest).not.toHaveBeenCalled();
  expect(emailRequest).not.toHaveBeenCalled();

  emailResource.emailRecipientCount = 5;
  expect(() => validateManagedFormRecipientLimit(graph)).not.toThrow();
});

test("an Email destination fails preflight before another Resource dispatches", () => {
  const httpRequest = vi.fn();
  const graph = {
    rootIds: ["http", "email"],
    resources: [
      {
        id: "http",
        outputName: "HTTP",
        dependencies: [],
        createRequest: httpRequest,
      },
      {
        id: "email",
        outputName: "Email",
        dependencies: [],
        control: "email" as const,
        createRequest: () => {
          throw new Error("Email must not run before preflight");
        },
      },
    ],
  };
  expect(() => validateManagedFormBodyFormats(graph, new FormData())).toThrow(
    "Email delivery requires Webstudio Cloud"
  );
  expect(httpRequest).not.toHaveBeenCalled();
});

test("an Email dependency fails preflight before its HTTP destination dispatches", () => {
  const httpRequest = vi.fn();
  const emailRequest = vi.fn();
  const graph = {
    rootIds: ["http"],
    resources: [
      {
        id: "http",
        outputName: "HTTP",
        dependencies: ["email"],
        createRequest: httpRequest,
      },
      {
        id: "email",
        outputName: "Email",
        dependencies: [],
        control: "email" as const,
        emailRecipientCount: 1,
        createRequest: emailRequest,
      },
    ],
  };
  expect(() => validateManagedFormBodyFormats(graph, new FormData())).toThrow(
    "Email delivery requires Webstudio Cloud"
  );
  expect(httpRequest).not.toHaveBeenCalled();
  expect(emailRequest).not.toHaveBeenCalled();
});

test("rejects an invalid dependency request before any destination runs", () => {
  const graph = {
    rootIds: ["submit"],
    resources: [
      {
        id: "lookup",
        outputName: "Lookup",
        dependencies: [],
        createRequest: () => ({
          name: "Lookup",
          method: "post" as const,
          url: "https://example.com/lookup",
          searchParams: [],
          headers: [],
          bodyFormat: "multipart" as const,
          body: "invalid scalar",
        }),
      },
      {
        id: "submit",
        outputName: "Submit",
        dependencies: ["lookup"],
        createRequest: () => {
          throw new Error("A destination must not run before preflight");
        },
      },
    ],
  };
  expect(() => validateManagedFormBodyFormats(graph, new FormData())).toThrow(
    "Multipart body expects an object of fields"
  );
});

test("reuses dependency-free requests after preflight", async () => {
  const createRequest = vi.fn(() => ({
    name: "Submit",
    method: "post" as const,
    url: "https://example.com/submit",
    searchParams: [],
    headers: [],
    bodyFormat: "json" as const,
    body: { message: "Hello" },
  }));
  const graph = validateManagedFormBodyFormats(
    {
      rootIds: ["submit"],
      resources: [
        {
          id: "submit",
          outputName: "Submit",
          dependencies: [],
          createRequest,
        },
      ],
    },
    new FormData()
  );
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ accepted: true })
  );
  await loadResources(fetch, graph);
  expect(createRequest).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledOnce();

  const createLookup = vi.fn(() => ({
    name: "Lookup",
    method: "get" as const,
    url: "https://example.com/lookup",
    searchParams: [],
    headers: [],
  }));
  const dependentGraph = validateManagedFormBodyFormats(
    {
      rootIds: ["submit"],
      resources: [
        {
          id: "lookup",
          outputName: "Lookup",
          dependencies: [],
          createRequest: createLookup,
        },
        {
          id: "submit",
          outputName: "Submit",
          dependencies: ["lookup"],
          createRequest: () => ({
            name: "Submit",
            method: "post",
            url: "https://example.com/submit",
            searchParams: [],
            headers: [],
            body: { message: "Hello" },
          }),
        },
      ],
    },
    new FormData()
  );
  await loadResources(fetch, dependentGraph);
  expect(createLookup).toHaveBeenCalledOnce();
});

test("an invalid dependent body never dispatches its destination", async () => {
  const requestedUrls: string[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    requestedUrls.push(String(input));
    return Response.json({ accepted: true });
  });
  const graph = validateManagedFormBodyFormats(
    {
      rootIds: ["independent", "dependent"],
      resources: [
        {
          id: "lookup",
          outputName: "Lookup",
          dependencies: [],
          createRequest: () => ({
            name: "Lookup",
            method: "get",
            url: "https://example.com/lookup",
            searchParams: [],
            headers: [],
          }),
        },
        {
          id: "independent",
          outputName: "Independent",
          dependencies: [],
          createRequest: () => ({
            name: "Independent",
            method: "post",
            url: "https://example.com/independent",
            searchParams: [],
            headers: [],
            bodyFormat: "json",
            body: { message: "Hello" },
          }),
        },
        {
          id: "dependent",
          outputName: "Dependent",
          dependencies: ["lookup"],
          createRequest: () => ({
            name: "Dependent",
            method: "post",
            url: "https://example.com/dependent",
            searchParams: [],
            headers: [],
            bodyFormat: "json",
            body: { attachment: new File(["hello"], "hello.txt") },
          }),
        },
      ],
    },
    new FormData()
  );
  const results = await loadResources(fetch, graph);
  expect(results).toMatchObject({
    Independent: { ok: true },
    Dependent: { ok: false, status: 400 },
  });
  expect(requestedUrls.sort()).toEqual([
    "https://example.com/independent",
    "https://example.com/lookup",
  ]);
});

test("checks each destination body before a managed submission", () => {
  const file = new File(["hello"], "hello.txt");
  const formData = new FormData();
  formData.set("attachment", file);
  let jsonBody: unknown = { message: "No file here" };
  const graph = {
    rootIds: ["json", "multipart"],
    resources: [
      {
        id: "json",
        outputName: "JSON",
        dependencies: [],
        createRequest: () => ({
          name: "JSON",
          method: "post" as const,
          url: "https://example.com/json",
          searchParams: [],
          headers: [],
          bodyFormat: "json" as const,
          body: jsonBody,
        }),
      },
      {
        id: "multipart",
        outputName: "Multipart",
        dependencies: [],
        createRequest: () => ({
          name: "Multipart",
          method: "post" as const,
          url: "https://example.com/multipart",
          searchParams: [],
          headers: [],
          bodyFormat: "multipart" as const,
          body: { attachment: file },
        }),
      },
    ],
  };
  expect(() => validateManagedFormBodyFormats(graph, formData)).not.toThrow();
  jsonBody = { attachment: file };
  expect(() => validateManagedFormBodyFormats(graph, formData)).toThrow(
    "JSON body cannot include uploaded files"
  );
});

test("ignores an unselected optional file input", () => {
  const formData = new FormData();
  formData.set("attachment", new File([], ""));
  formData.set(managedFormArrayNamesFieldName, "[]");
  expect(getManagedFormValues(formData)).toEqual({});
  const graph = {
    rootIds: ["submit"],
    resources: [
      {
        id: "submit",
        outputName: "Submit",
        dependencies: [],
        createRequest: () => ({
          name: "Submit",
          method: "post" as const,
          url: "https://example.com/submit",
          searchParams: [],
          headers: [],
          bodyFormat: "json" as const,
          body: getManagedFormValues(formData),
        }),
      },
    ],
  };
  expect(() => validateManagedFormBodyFormats(graph, formData)).not.toThrow();
});

test("catches a JSON default Form body before dependent Resources run", () => {
  const formData = new FormData();
  formData.set("attachment", new File(["hello"], "hello.txt"));
  const graph = {
    rootIds: ["submit"],
    resources: [
      {
        id: "submit",
        outputName: "Submit",
        dependencies: ["lookup"],
        usesDefaultFormBody: true,
        bodyFormat: "json" as const,
        createRequest: () => {
          throw new Error("Dependent requests cannot be evaluated yet");
        },
      },
    ],
  };
  expect(() => validateManagedFormBodyFormats(graph, formData)).toThrow(
    "JSON body cannot include uploaded files"
  );
});

test("parses bounded request bodies and rejects oversized streamed bodies", async () => {
  const formData = new FormData();
  formData.set("field", "value");
  const request = new Request("https://example.com/submit", {
    method: "POST",
    body: formData,
  });
  expect((await readFormDataWithLimit(request, 1024)).get("field")).toBe(
    "value"
  );

  const oversized = new Request("https://example.com/submit", {
    method: "POST",
    body: new Uint8Array([1, 2, 3, 4]),
  });
  await expect(readFormDataWithLimit(oversized, 3)).rejects.toThrow(
    "Form submission is too large"
  );
});

test("validates the managed Form bot field and keeps the Brave exception", () => {
  const formData = new FormData();
  expect(() => validateManagedFormBot(formData)).toThrow(
    "Form bot field not found"
  );
  formData.set(formBotFieldName, "brave");
  expect(() => validateManagedFormBot(formData)).not.toThrow();
  formData.set(formBotFieldName, "stale");
  expect(() => validateManagedFormBot(formData)).toThrow(
    "Form bot value invalid stale"
  );
});

test("reconstructs repeated and empty field groups without internal values", () => {
  const formData = new FormData();
  formData.append("choice", "first");
  formData.append("choice", "second");
  formData.set("scalar", "value");
  formData.set(
    managedFormArrayNamesFieldName,
    JSON.stringify(["choice", "empty"])
  );
  formData.set(managedFormIdFieldName, "form");
  formData.set(formIdFieldName, "legacy");
  formData.set(formBotFieldName, "brave");

  const values = getManagedFormValues(formData);
  expect(Object.getPrototypeOf(values)).toBe(null);
  expect(values).toEqual({
    choice: ["first", "second"],
    empty: [],
    scalar: "value",
  });
  expect(() => {
    formData.set(
      managedFormArrayNamesFieldName,
      JSON.stringify(["choice", "choice"])
    );
    getManagedFormValues(formData);
  }).toThrow("Invalid Form field groups");
});

test("preserves file values and only includes explicitly trusted IP", () => {
  const file = new File(["contents"], "upload.txt", { type: "text/plain" });
  const formData = new FormData();
  formData.set("upload", file);
  formData.set(managedFormArrayNamesFieldName, "[]");
  expect(getManagedFormValues(formData).upload).toBe(file);

  const request = new Request("https://example.com/submit", {
    headers: {
      "user-agent": "browser",
      "accept-language": "en",
      referer: "https://example.com/page",
      "cf-connecting-ip": "203.0.113.1",
    },
  });
  const info = getManagedFormBrowserInfo(request);
  expect(info).toEqual({
    userAgent: "browser",
    language: "en",
    referrer: "https://example.com/page",
  });
  expect(getManagedFormBrowserInfo(request, "203.0.113.1").ip).toBe(
    "203.0.113.1"
  );
});
