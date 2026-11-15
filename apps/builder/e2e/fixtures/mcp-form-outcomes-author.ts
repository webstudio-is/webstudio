import { authorFormActionCombination } from "./mcp-form-action-combination-author";
import { authorManagedForm } from "./mcp-managed-form-author";

const [, , projectId] = process.argv;
if (projectId === undefined) {
  throw new Error("Expected the disposable E2E project ID");
}

const successRedirect = "?mcp-e2e=success";
const successful = await authorManagedForm(projectId, {
  mode: "redirect",
  successRedirect,
  fail: false,
});
const failed = await authorManagedForm(projectId, {
  mode: "redirect",
  successRedirect,
  fail: true,
});
const feedback = await authorManagedForm(projectId, {
  mode: "redirect",
  fail: false,
});
const combination = await authorFormActionCombination(projectId);
process.stdout.write(
  `${JSON.stringify({ successful, failed, feedback, combination })}\n`
);
