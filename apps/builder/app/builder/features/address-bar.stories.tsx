import { useStore } from "@nanostores/react";
import type { Meta, StoryFn } from "@storybook/react";
import { Box, Text, theme } from "@webstudio-is/design-system";
import { AddressBarPopover } from "./address-bar";
import { $dataSources, $pages } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { $awareness, $selectedPage } from "~/shared/awareness";
import { $currentSystem } from "~/shared/system";

registerContainers();

$dataSources.set(new Map());

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
  },
  pages: [
    {
      id: "dynamicId",
      path: "/blog/:date/post/:slug",
      name: "",
      title: "",
      meta: {},
      rootInstanceId: "rootInstanceId",
    },
  ],
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
  title: "Builder/Address Bar",
  component: AddressBarPopover,
} satisfies Meta;

export const AddressBar: StoryFn = () => {
  $awareness.set({ pageId: "dynamicId" });
  return (
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
};
