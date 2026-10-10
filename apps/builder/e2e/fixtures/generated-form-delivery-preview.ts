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
const receiverPort = Number(process.argv[3]);
if (!Number.isInteger(port) || !Number.isInteger(receiverPort)) {
  throw new Error("Expected Preview and receiver ports");
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
  `import { getDeniedResourceHostnames } from "@webstudio-is/sdk/protected-resource-fetch";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";

export const createManagedFormEmailSender = () => undefined;
export const validateManagedFormEmail = () => undefined;
export const createManagedFormResourceFetch = ({ request, projectDomain }: { request: Request; projectDomain?: string }) => {
  const protectedFetch = createNodeProtectedResourceFetch({
    deniedHostnames: getDeniedResourceHostnames([new URL(request.url).hostname, projectDomain]),
  });
  const testFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const outgoing = new Request(input, init);
    const url = new URL(outgoing.url);
    protectedFetch.validateDestination(url);
    if (
      url.origin !== "https://mcp-delivery.example" ||
      (url.pathname !== "/submit" && url.pathname !== "/reject") ||
      url.search !== ""
    ) {
      throw new Error("Unexpected E2E Form delivery destination");
    }
    const receiver = new URL(url.pathname + url.search, "http://127.0.0.1:${receiverPort}");
    return fetch(new Request(receiver, outgoing));
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
