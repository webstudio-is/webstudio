import { authorFormActionCombination } from "./mcp-form-action-combination-author";
import { authorFormCallbacks } from "./mcp-form-callbacks-author";
import { authorQuerySearch } from "./mcp-query-search-author";

const [, , projectId, managedPath, concurrencyPath] = process.argv;
if (
  projectId === undefined ||
  managedPath === undefined ||
  concurrencyPath === undefined
) {
  throw new Error(
    "Expected a project ID and managed callback and concurrency paths"
  );
}

const receiverUrl = "https://mcp-delivery.example/submit";
await authorFormCallbacks({ projectId, mode: "legacy", receiverUrl });
await authorFormCallbacks({
  projectId,
  mode: "managed",
  receiverUrl,
  path: managedPath,
});
await authorQuerySearch(projectId);
const actions = await authorFormActionCombination(
  projectId,
  undefined,
  concurrencyPath
);
process.stdout.write(`${JSON.stringify(actions)}\n`);
