import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { waitForGeneratedPreview } from "../flows/generated-app";
import { measure } from "../perf";

// Load the CLI in this isolated runner; Builder's tsconfig does not include
// the CLI's import-attribute module setting.
const previewModuleUrl = new URL(
  "../../../../packages/cli/src/commands/preview.ts",
  import.meta.url
).href;
const previewServerModuleUrl = new URL(
  "../../../../packages/cli/src/preview-server/index.ts",
  import.meta.url
).href;
const { buildPreparedPreview, preparePreviewProject } = await import(
  previewModuleUrl
);
const { startPreviewServer, waitForPreviewExit } = await import(
  previewServerModuleUrl
);

const port = Number(process.argv[2]);
const emailPort = Number(process.argv[3]);
const queryPort =
  process.argv[4] === undefined ? undefined : Number(process.argv[4]);
if (
  !Number.isInteger(port) ||
  !Number.isInteger(emailPort) ||
  (queryPort !== undefined && !Number.isInteger(queryPort))
) {
  throw new Error("Expected Preview and local email receiver ports");
}

const project = await measure<{ cwd: string }>(
  "generated Email preview project preparation",
  () =>
    preparePreviewProject({
      assets: false,
      template: ["defaults", "react-router"],
      generate: true,
      source: "local",
    })
);
await writeFile(
  join(
    project.cwd,
    "app/__generated__/$resources.managed-form-fetch.server.ts"
  ),
  `import { createCloudflareManagedFormEmailSender, validateCloudflareManagedFormEmail } from "@webstudio-is/sdk/runtime";
import { getDeniedResourceHostnames } from "@webstudio-is/sdk/protected-resource-fetch";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";

// This test-only RPC binding records payloads through the loopback capture server.
export const createManagedFormEmailSender = ({ formData, projectId }: { context: unknown; formData: FormData; projectId: string }) => createCloudflareManagedFormEmailSender({
  sendEmail: async (sentProjectId, payload) => {
    if (sentProjectId !== projectId) {
      throw new Error("Unexpected test Email Service project ID");
    }
    const response = await fetch("http://127.0.0.1:${emailPort}/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return response.ok
      ? { ok: true, status: response.status, statusText: response.statusText, data }
      : { ok: false, status: response.status, statusText: response.statusText, data };
  },
}, formData, projectId);

export const validateManagedFormEmail = validateCloudflareManagedFormEmail;
export const createManagedFormResourceFetch = ({ request, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  const protectedFetch = createNodeProtectedResourceFetch({
    deniedHostnames: getDeniedResourceHostnames([new URL(request.url).hostname, projectDomain]),
  });
  ${
    queryPort === undefined
      ? "return protectedFetch;"
      : `
  const validateDestination = (url: URL) => {
    if (
      url.origin !== "https://mcp-delivery.example" ||
      url.pathname !== "/submit" ||
      [...url.searchParams.keys()].some((key) => key !== "tag") ||
      url.hash !== ""
    ) {
      throw new Error("Unexpected E2E Form query destination");
    }
    protectedFetch.validateDestination(url);
  };
  const captureQueryDelivery = async (input: RequestInfo | URL, init?: RequestInit) => {
    const outgoing = new Request(input, init);
    const destination = new URL(outgoing.url);
    validateDestination(destination);
    if (outgoing.method !== "POST") {
      throw new Error("Expected an E2E Form query POST");
    }
    const target = new URL(destination.pathname + destination.search, "http://127.0.0.1:${queryPort}");
    return fetch(new Request(target, outgoing));
  };
  return Object.assign(captureQueryDelivery, { validateDestination });`
  }
};
`
);
await measure("generated Email preview production build", () =>
  buildPreparedPreview(project)
);
const preview = startPreviewServer({
  host: "127.0.0.1",
  port,
  cwd: project.cwd,
});
await Promise.all([
  waitForPreviewExit(preview.process),
  measure("generated Email preview server readiness", () =>
    waitForGeneratedPreview({
      process: preview.process,
      url: `http://127.0.0.1:${port}/`,
      output: () => "",
    })
  ),
]);
