import { rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
const httpPort = Number(process.argv[4]);
if (
  !Number.isInteger(port) ||
  !Number.isInteger(emailPort) ||
  !Number.isInteger(httpPort)
) {
  throw new Error("Expected Preview, email receiver, and HTTP receiver ports");
}

const prepareModule = process.argv[5];
const authorProjectId = process.argv[6];
if (prepareModule !== undefined && authorProjectId !== undefined) {
  const { preparePreviewBundle } = await import(prepareModule);
  const prepared = await preparePreviewBundle(authorProjectId);
  await writeFile("preview-prepared.json", JSON.stringify(prepared));
}

const project = await preparePreviewProject({
  assets: false,
  template: ["defaults", "react-router"],
  generate: true,
  source: "local",
});
const adapterPath = join(
  project.cwd,
  "app/__generated__/$resources.managed-form-fetch.server.ts"
);
await rename(
  adapterPath,
  join(project.cwd, "app/__generated__/production-form-fetch.server.ts")
);
await writeFile(
  adapterPath,
  `import { createCloudflareManagedFormEmailSender, validateCloudflareManagedFormEmail } from "@webstudio-is/sdk/runtime";
import { getDeniedResourceHostnames } from "@webstudio-is/sdk/protected-resource-fetch";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
import { createManagedFormResourceFetch as createProductionFormFetch } from "./production-form-fetch.server";

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
export const createManagedFormResourceFetch = ({ request, context, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  const previewHostname = new URL(request.url).hostname;
  const productionFetch = createProductionFormFetch({ request, context, projectDomain });
  const protectedFetch = createNodeProtectedResourceFetch({
    deniedHostnames: getDeniedResourceHostnames([previewHostname, projectDomain]),
  });
  const testFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const outgoing = new Request(input, init);
    const destination = new URL(outgoing.url);
    if (destination.hostname === previewHostname) {
      return productionFetch(outgoing);
    }
    protectedFetch.validateDestination(destination);
    if (destination.href !== "https://mcp-delivery.example/submit") {
      throw new Error("Unexpected E2E HTTP destination");
    }
    return fetch(new Request("http://127.0.0.1:${httpPort}/submit", outgoing));
  };
  return Object.assign(testFetch, {
    validateDestination: (url: URL) => url.hostname === previewHostname
      ? productionFetch.validateDestination(url)
      : protectedFetch.validateDestination(url),
  });
};
`
);
await buildPreparedPreview(project);
const preview = startPreviewServer({
  host: "127.0.0.1",
  port,
  cwd: project.cwd,
});
await waitForPreviewExit(preview.process);
