import { expect, test } from "vitest";
import { getClosestInstance, type InstancePath } from "./hook";

test("get closest instance", () => {
  const instancePath: InstancePath = [
    {
      id: "4",
      instanceSelector: ["4", "3", "2", "1", "0"],
      component: "Content",
    },
    {
      id: "3",
      instanceSelector: ["3", "2", "1", "0"],
      component: "Tabs",
    },
    {
      id: "2",
      instanceSelector: ["2", "1", "0"],
      component: "Content",
    },
    {
      id: "1",
      instanceSelector: ["1", "0"],
      component: "Tabs",
    },
    {
      id: "0",
      instanceSelector: ["0"],
      component: "Body",
    },
  ];
  const [content2, tabs2, content1, tabs1, _body] = instancePath;
  expect(getClosestInstance(instancePath, content2, "Tabs")).toBe(tabs2);
  expect(getClosestInstance(instancePath, content1, "Tabs")).toBe(tabs1);
});
