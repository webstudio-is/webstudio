import { useStore } from "@nanostores/react";
import type { Meta, StoryFn } from "@storybook/react";
import { StorySection, Text } from "@webstudio-is/design-system";
import { ToolbarButton } from "@webstudio-is/design-system";
import { WebstudioIcon } from "@webstudio-is/icons";
import { TopbarLayout } from "~/builder/shared/topbar-layout";
import { AddressBarPopover } from "./address-bar";
import { $dataSources, $pages } from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $selectedPage } from "~/shared/nano-states";
import { $selectedPageId } from "~/shared/nano-states";
import { $currentSystem } from "~/shared/system";

registerContainers();

$dataSources.set(new Map());

$pages.set({
  homePageId: "homeId",
  rootFolderId: "rootId",
  folders: new Map([
    [
      "rootId",
      {
        id: "rootId",
        name: "",
        slug: "",
        children: ["homeId", "dynamicId"],
      },
    ],
  ]),
  pages: new Map([
    [
      "homeId",
      {
        id: "homeId",
        path: "",
        name: "",
        title: "",
        meta: {},
        rootInstanceId: "",
      },
    ],
    [
      "dynamicId",
      {
        id: "dynamicId",
        path: "/blog/:date/post/:slug",
        name: "",
        title: "",
        meta: {},
        rootInstanceId: "rootInstanceId",
      },
    ],
  ]),
});

const SystemInspect = () => {
  const system = useStore($currentSystem);
  return (
    <Text variant="mono" css={{ whiteSpace: "pre" }}>
      {JSON.stringify(system, null, 2)}
    </Text>
  );
};

const HistoryInspect = () => {
  const page = useStore($selectedPage);
  return (
    <Text variant="mono" css={{ whiteSpace: "pre" }}>
      {JSON.stringify(page?.history, null, 2)}
    </Text>
  );
};

export default {
  title: "Address Bar",
  component: AddressBarPopover,
} satisfies Meta;

export const AddressBar: StoryFn = () => {
  $selectedPageId.set("dynamicId");
  return (
    <StorySection title="Address Bar">
      <TopbarLayout
        menu={
          <ToolbarButton aria-label="Menu">
            <WebstudioIcon size={22} />
          </ToolbarButton>
        }
        left={<AddressBarPopover />}
      />
      <SystemInspect />
      <HistoryInspect />
    </StorySection>
  );
};
