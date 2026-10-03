import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page } from "@vitest/browser/context";
import { afterEach, beforeEach, expect, test } from "vitest";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { $planFeatures } from "~/shared/nano-states";
import { $projectSettings } from "~/shared/sync/data-stores";
import { SectionEmails } from "./section-emails";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let previousSettings: ReturnType<typeof $projectSettings.get>;
let previousPlan: ReturnType<typeof $planFeatures.get>;

beforeEach(() => {
  previousSettings = $projectSettings.get();
  previousPlan = $planFeatures.get();
  $projectSettings.set({ meta: {}, compiler: {} });
  $planFeatures.set(defaultPlanFeatures);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  $projectSettings.set(previousSettings);
  $planFeatures.set(previousPlan);
});

test("shows the free and paid address limits in Project Emails", async () => {
  act(() => root.render(<SectionEmails />));
  await act(async () =>
    page
      .getByPlaceholder("Olegs Isonen <oleg008@gmail.com>, team@example.com")
      .fill("one@example.com")
  );
  expect(
    page
      .getByRole("tooltip")
      .getByText("Upgrade to PRO to customize the contact email.")
  ).toBeVisible();
  expect($projectSettings.get()?.meta.contactEmail).toBeUndefined();

  await act(async () =>
    $planFeatures.set({ ...defaultPlanFeatures, maxContactEmailsPerProject: 1 })
  );
  expect(document.body.textContent).not.toContain(
    "Upgrade to PRO to customize the contact email."
  );
  await act(async () =>
    page
      .getByPlaceholder("Olegs Isonen <oleg008@gmail.com>, team@example.com")
      .fill("one@example.com, two@example.com")
  );
  expect(
    page.getByRole("tooltip").getByText("Only 1 emails are allowed.")
  ).toBeVisible();
  expect($projectSettings.get()?.meta.contactEmail).toBeUndefined();
});
