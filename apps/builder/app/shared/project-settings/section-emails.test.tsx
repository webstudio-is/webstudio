import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, beforeEach, expect, test } from "vitest";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { TooltipProvider } from "@webstudio-is/design-system";
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
  act(() =>
    root.render(
      <TooltipProvider delayDuration={0}>
        <SectionEmails />
      </TooltipProvider>
    )
  );
  await act(async () =>
    page
      .getByPlaceholder("Acme <acme@example.com>, team@example.com")
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
      .getByPlaceholder("Acme <acme@example.com>, team@example.com")
      .fill("one@example.com, two@example.com")
  );
  expect(
    page.getByRole("tooltip").getByText("Only 1 emails are allowed.")
  ).toBeVisible();
  expect($projectSettings.get()?.meta.contactEmail).toBeUndefined();
});

test("visitor email body is configured on its Email Resource", () => {
  act(() =>
    root.render(
      <TooltipProvider delayDuration={0}>
        <SectionEmails />
      </TooltipProvider>
    )
  );
  expect(document.body.textContent).toContain("Visitor email subject");
  expect(document.body.textContent).not.toContain(
    "Emails are sent through Webstudio. Replies go to this address."
  );
  expect(document.body.textContent).not.toContain(
    "Visitor confirmation plain-text body"
  );
});

test("keyboard users can open the existing recipients helper", async () => {
  const recipientsHelp =
    "Existing Contact email recipients are also used by legacy forms. Leave empty to send new Email Resources to the project owner.";
  act(() =>
    root.render(
      <TooltipProvider delayDuration={0}>
        <SectionEmails />
      </TooltipProvider>
    )
  );

  expect(document.querySelector("#project-contact-email")).not.toBeNull();
  expect(document.body.textContent).not.toContain(recipientsHelp);

  const recipientsHelpButton = document.querySelector(
    'button[aria-label="Recipients"]'
  );
  expect(recipientsHelpButton).not.toBeNull();
  expect(
    document.querySelector('button[aria-label="About recipients"]')
  ).toBeNull();
  for (let attempts = 0; attempts < 10; attempts += 1) {
    if (document.activeElement === recipientsHelpButton) {
      break;
    }
    await act(async () => userEvent.tab());
  }
  expect(document.activeElement).toBe(recipientsHelpButton);
  await act(async () => userEvent.keyboard("{Enter}"));
  expect(page.getByRole("tooltip").getByText(recipientsHelp)).toBeVisible();
});

test("keyboard users can open the existing owner body helper", async () => {
  const ownerBodyHelp =
    "Leave empty for the default message. Form-scoped Email Resources include submitted fields and browser information by default. Edit an Email Resource body expression to use bindings in a custom message.";
  act(() =>
    root.render(
      <TooltipProvider delayDuration={0}>
        <SectionEmails />
      </TooltipProvider>
    )
  );

  expect(document.querySelector("#project-emailBody")).not.toBeNull();
  expect(document.body.textContent).not.toContain(ownerBodyHelp);
  const ownerBodyHelpButton = document.querySelector(
    'button[aria-label="Owner plain-text body"]'
  );
  expect(ownerBodyHelpButton).not.toBeNull();
  expect(
    document.querySelector('button[aria-label="About owner plain-text body"]')
  ).toBeNull();
  for (let attempts = 0; attempts < 10; attempts += 1) {
    if (document.activeElement === ownerBodyHelpButton) {
      break;
    }
    await act(async () => userEvent.tab());
  }
  expect(document.activeElement).toBe(ownerBodyHelpButton);
  await act(async () => userEvent.keyboard("{Enter}"));
  expect(page.getByRole("tooltip").getByText(ownerBodyHelp)).toBeVisible();
});
