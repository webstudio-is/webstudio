import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { $planFeatures } from "~/shared/nano-states";
import { domainToPublishName } from "./domain-checkbox";
import { __testing__ } from "./publish";

const { Publish } = __testing__;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("uses the workspace allowance above the old user limit and blocks only when exhausted", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const previousPlan = $planFeatures.get();
  $planFeatures.set({ ...defaultPlanFeatures, maxDailyPublishesPerUser: 100 });
  const project = {
    id: "project",
    domain: "project-domain",
    latestBuildVirtual: null,
  } as Project;
  const render = (used: number) =>
    act(() =>
      root.render(
        <TooltipProvider>
          <form>
            <input
              type="hidden"
              name={domainToPublishName}
              value="project-domain"
            />
            <Publish
              project={project}
              publishUsage={{ used, limit: 300, remaining: 300 - used }}
              refreshUsage={() => {}}
              refresh={async () => {}}
              restrictedFeatures={new Map()}
            />
          </form>
        </TooltipProvider>
      )
    );
  try {
    render(150);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    await vi.waitFor(() => expect(button?.disabled).toBe(false));
    render(300);
    expect(button?.disabled).toBe(true);
    render(0);
    expect(button?.disabled).toBe(false);
  } finally {
    act(() => root.unmount());
    container.remove();
    $planFeatures.set(previousPlan);
  }
});
