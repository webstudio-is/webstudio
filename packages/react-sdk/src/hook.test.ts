import { expect, test } from "@jest/globals";
import { getClosestInstance, type InstancePath } from "./hook";

test("get closest instance", () => {
  const instancePath: InstancePath = [
    { type: "instance", id: "4", component: "Content", children: [] },
    { type: "instance", id: "3", component: "Tabs", children: [] },
    { type: "instance", id: "2", component: "Content", children: [] },
    { type: "instance", id: "1", component: "Tabs", children: [] },
    { type: "instance", id: "0", component: "Body", children: [] },
  ];
  const [content2, tabs2, content1, tabs1, _body] = instancePath;
  expect(getClosestInstance(instancePath, content2, "Tabs")).toBe(tabs2);
  expect(getClosestInstance(instancePath, content1, "Tabs")).toBe(tabs1);
});
