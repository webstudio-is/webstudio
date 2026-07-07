import type { Meta, StoryFn } from "@storybook/react";
import { useEffect } from "react";
import { initialBreakpoints, coreMetas } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { $breakpoints } from "~/shared/sync/data-stores";
import { $pages } from "~/shared/sync/data-stores";
import { $selectedPageId } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { StorySection } from "@webstudio-is/design-system";
import { CommandPanel as CommandPanelComponent } from "./command-panel";
import { openCommandPanel } from "./command-state";

const meta: Meta = {
  title: "Command Panel",
};
export default meta;

registerContainers();

$registeredComponentMetas.set(
  new Map(
    Object.entries({
      ...coreMetas,
      ...baseComponentMetas,
    })
  )
);

$breakpoints.set(
  new Map(
    initialBreakpoints.map((breakpoint, index) => [
      index.toString(),
      { ...breakpoint, id: index.toString() },
    ])
  )
);

const pages = createDefaultPages({ rootInstanceId: "" });
pages.pages.set("page2", {
  id: "page2",
  path: "",
  name: "Second Page",
  rootInstanceId: "",
  title: "",
  meta: {},
});
pages.pages.set("page3", {
  id: "page3",
  path: "",
  name: "Thrid Page",
  rootInstanceId: "",
  title: "",
  meta: {},
});
$pages.set(pages);
$selectedPageId.set(pages.homePageId);

export const CommandPanel: StoryFn = () => {
  useEffect(() => {
    openCommandPanel();
  }, []);
  return (
    <StorySection title="Command Panel">
      <CommandPanelComponent />
    </StorySection>
  );
};
