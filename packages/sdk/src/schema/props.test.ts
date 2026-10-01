import { expect, test } from "vitest";
import { prop } from "./props";

test("a form action can reference several Resources and email", () => {
  const action = {
    id: "action",
    instanceId: "form",
    name: "action",
    type: "resource",
    value: { resourceIds: ["crm", "newsletter"], includeEmail: true },
  };
  expect(prop.parse(action)).toEqual(action);
});
