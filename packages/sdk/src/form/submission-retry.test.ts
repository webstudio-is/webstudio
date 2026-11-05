import { expect, test } from "vitest";
import { handleManagedFormSubmission } from "./server-handler";
import { handleDeprecatedWebhookFormSubmission } from "./deprecated-webhook-form";
import {
  formBotFieldName,
  formIdFieldName,
  managedFormIdFieldName,
  managedFormArrayNamesFieldName,
} from "./fields";
import { createProtectedResourceFetch } from "../protected-resource-fetch";

test.each(
  (["managed", "legacy"] as const).flatMap((kind) =>
    (["error", "network", "redirect"] as const).map((outcome) => ({
      kind,
      outcome,
    }))
  )
)(
  "$kind submissions dispatch one write after $outcome",
  async ({ kind, outcome }) => {
    let writes = 0;
    const resourceFetch = createProtectedResourceFetch({
      deniedHostnames: [],
      transport: async ({ method }) => {
        if (method === "GET") {
          return { response: Response.json({ accepted: true }) };
        }
        writes += 1;
        if (outcome === "network") {
          throw new TypeError("Response connection lost after writing");
        }
        if (outcome === "redirect") {
          return {
            response: new Response(null, {
              status: 302,
              headers: { location: "https://result.example/response" },
            }),
          };
        }
        return { response: new Response(null, { status: 503 }) };
      },
    });
    const graph = {
      rootIds: ["append"],
      resources: [
        {
          id: "append",
          outputName: "append",
          dependencies: [],
          createRequest: () => ({
            name: "Append row",
            method: "post" as const,
            url: "https://api.example/append",
            headers: [],
            searchParams: [],
            body: { message: "hello" },
          }),
        },
      ],
    };
    const formData = new FormData();
    formData.set(formBotFieldName, Date.now().toString(16));
    formData.set(
      kind === "managed" ? managedFormIdFieldName : formIdFieldName,
      "form"
    );
    formData.set("message", "hello");
    if (kind === "managed") {
      formData.set(managedFormArrayNamesFieldName, "[]");
    }
    const url = new URL("https://site.example/contact");
    const request = new Request(url, { method: "POST" });
    const result =
      kind === "managed"
        ? await handleManagedFormSubmission({
            request,
            formData,
            system: {
              origin: url.origin,
              pathname: url.pathname,
              params: {},
              search: {},
            },
            configuration: () => ({
              action: [{ dataSourceId: "source" }],
              resourceIds: ["append"],
            }),
            getGraph: () => graph,
            resourceFetch,
          })
        : await handleDeprecatedWebhookFormSubmission({
            request,
            formData,
            url,
            resources: {
              data: graph,
              action: new Map([
                ["form", { id: "append", outputName: "append" }],
              ]),
            },
            resourceFetch,
            dependencyFetch: resourceFetch,
            createEmailSender: () => async () => {
              throw new Error("Unexpected email");
            },
            validateEmail: () => {},
          });
    expect(result.success).toBe(outcome === "redirect");
    expect(writes).toBe(1);
  }
);
