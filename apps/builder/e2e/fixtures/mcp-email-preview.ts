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
if (!Number.isInteger(port) || !Number.isInteger(emailPort)) {
  throw new Error("Expected Preview and local email receiver ports");
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
  return createNodeProtectedResourceFetch({
    deniedHostnames: getDeniedResourceHostnames([new URL(request.url).hostname, projectDomain]),
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
