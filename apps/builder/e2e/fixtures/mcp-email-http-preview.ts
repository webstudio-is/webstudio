import { writeFile } from "node:fs/promises";
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

const project = await preparePreviewProject({
  assets: false,
  template: ["defaults", "react-router"],
  generate: true,
  source: "local",
});
await writeFile(
  join(
    project.cwd,
    "app/__generated__/$resources.managed-form-fetch.server.ts"
  ),
  `import { createCloudflareManagedFormEmailSender, validateCloudflareManagedFormEmail } from "@webstudio-is/sdk/runtime";
import { getDeniedResourceHostnames } from "@webstudio-is/sdk/protected-resource-fetch";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";

// This test-only binding forwards the SDK's real Email Service envelope to
// the loopback capture server. It never contacts the configured Email Service.
export const createManagedFormEmailSender = ({ formData, projectId }: { context: unknown; formData: FormData; projectId: string }) => createCloudflareManagedFormEmailSender({
  fetch: async (input, init) => {
    const outgoing = input instanceof Request ? input : new Request(input, init);
    if (outgoing.url !== "https://email-service.internal/v1/send") {
      throw new Error("Unexpected test Email Service URL");
    }
    return fetch(new Request("http://127.0.0.1:${emailPort}/send", outgoing));
  },
}, formData, projectId);

export const validateManagedFormEmail = validateCloudflareManagedFormEmail;
export const createManagedFormResourceFetch = ({ request, projectDomain }: { request: Request; context: unknown; projectDomain?: string }) => {
  const protectedFetch = createNodeProtectedResourceFetch({
    deniedHostnames: getDeniedResourceHostnames([new URL(request.url).hostname, projectDomain]),
  });
  const testFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const outgoing = new Request(input, init);
    const destination = new URL(outgoing.url);
    protectedFetch.validateDestination(destination);
    if (destination.href !== "https://mcp-delivery.example/submit") {
      throw new Error("Unexpected E2E HTTP destination");
    }
    return fetch(new Request("http://127.0.0.1:${httpPort}/submit", outgoing));
  };
  return Object.assign(testFetch, {
    validateDestination: (url: URL) => protectedFetch.validateDestination(url),
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
