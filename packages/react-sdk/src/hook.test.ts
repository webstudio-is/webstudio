import { expect, test } from "vitest";
import { getClosestInstance, type InstancePath } from "./hook";

test("get closest instance", () => {
  const instancePath: InstancePath = [
    {
      id: "4",
      instanceKey: JSON.stringify(["4", "3", "2", "1", "0"]),
      component: "Content",
    },
    {
      id: "3",
      instanceKey: JSON.stringify(["3", "2", "1", "0"]),
      component: "Tabs",
    },
    {
      id: "2",
      instanceKey: JSON.stringify(["2", "1", "0"]),
      component: "Content",
    },
    {
      id: "1",
      instanceKey: JSON.stringify(["1", "0"]),
      component: "Tabs",
    },
    {
      id: "0",
      instanceKey: JSON.stringify(["0"]),
      component: "Body",
    },
  ];
  const [content2, tabs2, content1, tabs1, _body] = instancePath;
  expect(getClosestInstance(instancePath, content2, "Tabs")).toBe(tabs2);
  expect(getClosestInstance(instancePath, content1, "Tabs")).toBe(tabs1);
});
