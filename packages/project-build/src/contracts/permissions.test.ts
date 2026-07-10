import { expect, test } from "vitest";
import {
  apiCapabilities,
  builderApiCapabilities,
  projectPermits,
  type ApiCapability,
  type BuilderApiCapability,
  type ProjectPermit,
} from "./permissions";

const apiCapability: ApiCapability = "api";
const projectPermit: ProjectPermit = "build";
const builderApiCapability: BuilderApiCapability = apiCapability;
const builderProjectCapability: BuilderApiCapability = projectPermit;
void builderApiCapability;
void builderProjectCapability;

test("derives builder api capabilities from api capabilities and project permits", () => {
  expect(builderApiCapabilities).toEqual([
    ...apiCapabilities,
    ...projectPermits,
  ]);
  expect(new Set(builderApiCapabilities).size).toBe(
    builderApiCapabilities.length
  );
});
