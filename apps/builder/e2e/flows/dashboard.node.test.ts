import { expect, test } from "vitest";
import { getWorkerEmail } from "./dashboard";

test("isolates login identities between parallel Playwright workers", () => {
  expect(getWorkerEmail("editor@webstudio.test", "0")).toBe(
    "editor+worker-0@webstudio.test"
  );
  expect(getWorkerEmail("editor@webstudio.test", "1")).toBe(
    "editor+worker-1@webstudio.test"
  );
});
