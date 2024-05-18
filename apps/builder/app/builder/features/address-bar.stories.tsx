import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { Meta, StoryFn } from "@storybook/react";
import { Box, Text, theme } from "@webstudio-is/design-system";
import { AddressBarPopover } from "./address-bar";
import {
  $dataSourceVariables,
  $dataSources,
  $pages,
  $selectedPage,
  $selectedPageId,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";

registerContainers();

$dataSources.set(
  new Map([
    [
      "systemId",
      {
        id: "systemId",
        scopeInstanceId: "rootInstanceId",
        name: "system",
        type: "parameter",
      },
    ],
  ])
);

$pages.set({
  folders: [
    {
      id: "rootId",
      name: "",
      slug: "",
      children: ["homeId", "dynamicId"],
    },
  ],
  homePage: {
    id: "homeId",
    path: "",
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "",
    systemDataSourceId: "",
  },
  pages: [
    {
      id: "dynamicId",
      path: "/blog/:date/post/:slug",
      name: "",
      title: "",
      meta: {},
      rootInstanceId: "rootInstanceId",
      systemDataSourceId: "systemId",
    },
  ],
});

$selectedPageId.set("dynamicId");

const $selectedPageSystem = computed(
  [$selectedPage, $dataSourceVariables],
  (selectedPage, dataSourceVariables) => {
    if (selectedPage === undefined) {
      return {};
    }
    return dataSourceVariables.get(selectedPage.systemDataSourceId);
  }
);

const SystemInspect = () => {
  const system = useStore($selectedPageSystem);
  return (
    <Text variant="mono" css={{ whiteSpace: "pre" }}>
      {JSON.stringify(system, null, 2)}
    </Text>
  );
};

const $selectedPageHistory = computed(
  $selectedPage,
  (page) => page?.history ?? []
);

const HistoryInspect = () => {
  const history = useStore($selectedPageHistory);
  return (
    <Text variant="mono" css={{ whiteSpace: "pre" }}>
      {JSON.stringify(history, null, 2)}
    </Text>
  );
};

export default {
  title: "Builder/Address Bar",
  component: AddressBarPopover,
} satisfies Meta;

export const AddressBar: StoryFn = () => (
  <>
    <Box
      css={{
        height: theme.spacing[15],
        background: theme.colors.backgroundTopbar,
        color: theme.colors.foregroundContrastMain,
      }}
    >
      <AddressBarPopover />
    </Box>
    <SystemInspect />
    <HistoryInspect />
  </>
);
