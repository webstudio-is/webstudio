import { afterAll, afterEach, describe, test, expect } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $project } from "~/shared/sync/data-stores";
import { $authPermit, $planFeatures } from "~/shared/nano-states";
import { DomainCheckbox, domainToPublishName } from "./domain-checkbox";
import { __testing__ } from "./domain-checkbox";

const { isCustomDomainPublishRestricted } = __testing__;

const initialPlan = $planFeatures.get();
const initialAuthPermit = $authPermit.get();
let root: Root | undefined;
let container: HTMLDivElement | undefined;

const reactEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
const originalActEnvironment = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;
reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

afterAll(() => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  $project.set(undefined);
  $planFeatures.set(initialPlan);
  $authPermit.set(initialAuthPermit);
});

const renderCheckbox = () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <TooltipProvider>
        <form>
          <DomainCheckbox
            domain="custom.example"
            buildId="build-1"
            defaultChecked
            isCustomDomain
          />
        </form>
      </TooltipProvider>
    )
  );
  return {
    checkbox: container.querySelector<HTMLButtonElement>('[role="checkbox"]')!,
    form: container.querySelector("form")!,
  };
};

test("removes a selected custom domain from the form when publishing becomes restricted", async () => {
  $project.set({
    id: "project-1",
    domainsVirtual: [
      { domain: "custom.example", status: "ACTIVE", verified: true },
    ],
  } as Project);
  $planFeatures.set({ ...initialPlan, allowStagingPublish: true });
  $authPermit.set("own");
  const { checkbox, form } = renderCheckbox();
  expect(checkbox).toBeEnabled();
  expect(checkbox.getAttribute("aria-checked")).toBe("true");
  expect(new FormData(form).getAll(domainToPublishName)).toEqual([
    "custom.example",
  ]);

  await act(async () => $authPermit.set("build"));
  const restrictedCheckbox =
    form.querySelector<HTMLButtonElement>('[role="checkbox"]')!;
  expect(restrictedCheckbox).toBeDisabled();
  expect(restrictedCheckbox.getAttribute("aria-checked")).toBe("false");
  expect(new FormData(form).getAll(domainToPublishName)).toEqual([]);
});

describe("isCustomDomainPublishRestricted", () => {
  describe("free plan (allowStagingPublish=false), no builder role", () => {
    test("custom domain → restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: false,
          isCustomDomain: true,
        })
      ).toBe(true);
    });

    test("staging domain → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: false,
          isCustomDomain: false,
        })
      ).toBe(false);
    });

    test("isCustomDomain undefined → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: false,
          isCustomDomain: undefined,
        })
      ).toBe(false);
    });
  });

  describe("pro plan (allowStagingPublish=true), no builder role", () => {
    test("custom domain → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: false,
          isCustomDomain: true,
        })
      ).toBe(false);
    });

    test("staging domain → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: false,
          isCustomDomain: false,
        })
      ).toBe(false);
    });
  });

  describe("builder role (canPublishToStagingOnly=true)", () => {
    test("custom domain on pro plan → restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: true,
          isCustomDomain: true,
        })
      ).toBe(true);
    });

    test("staging domain on pro plan → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: true,
          isCustomDomain: false,
        })
      ).toBe(false);
    });

    test("custom domain on free plan → restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: true,
          isCustomDomain: true,
        })
      ).toBe(true);
    });

    test("staging domain on free plan → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: true,
          isCustomDomain: false,
        })
      ).toBe(false);
    });
  });
});
