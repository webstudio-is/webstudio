import type { Meta, StoryFn } from "@storybook/react";
import { useEffect } from "react";
import { initialBreakpoints, coreMetas } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import {
  $breakpoints,
  $pages,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { $awareness } from "~/shared/awareness";
import { registerContainers } from "~/shared/sync";
import {
  CommandPanel as CommandPanelComponent,
  openCommandPanel,
} from "./command-panel";

const meta: Meta = {
  title: "CommandPanel",
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
pages.pages.push({
  id: "page2",
  path: "",
  name: "Second Page",
  rootInstanceId: "",
  title: "",
  meta: {},
});
pages.pages.push({
  id: "page3",
  path: "",
  name: "Thrid Page",
  rootInstanceId: "",
  title: "",
  meta: {},
});
$pages.set(pages);
$awareness.set({ pageId: pages.homePage.id });

export const CommandPanel: StoryFn = () => {
  useEffect(() => {
    const controller = new AbortController();
    addEventListener(
      "keydown",
      (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "k") {
          openCommandPanel();
        }
      },
      { signal: controller.signal }
    );
    return () => {
      controller.abort();
    };
  }, []);
  return (
    <>
      <button onClick={openCommandPanel}>Open command panel</button>
      <br />
      <input
        defaultValue="Press cmd+k to open command panel"
        style={{ width: 300 }}
      />
      <CommandPanelComponent />
    </>
  );
};
