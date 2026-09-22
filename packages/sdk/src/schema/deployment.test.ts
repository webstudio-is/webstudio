import { expect, test } from "vitest";
import { getPublishTarget } from "./deployment";

test.each([
  {
    name: "explicit staging",
    deployment: {
      destination: "saas" as const,
      target: "staging" as const,
      domains: ["project.webstudio.io"],
    },
    target: "staging",
  },
  {
    name: "explicit production",
    deployment: {
      destination: "saas" as const,
      target: "production" as const,
      domains: ["project.webstudio.io"],
    },
    target: "production",
  },
  {
    name: "legacy staging",
    deployment: {
      destination: "saas" as const,
      domains: ["project.webstudio.io"],
      assetsDomain: "project.webstudio.io",
    },
    target: "staging",
  },
  {
    name: "legacy production",
    deployment: {
      destination: "saas" as const,
      domains: ["project.webstudio.io", "www.example.com"],
      assetsDomain: "project.webstudio.io",
    },
    target: "production",
  },
])("resolves $name published deployment target", ({ deployment, target }) => {
  expect(getPublishTarget(deployment)).toBe(target);
});
