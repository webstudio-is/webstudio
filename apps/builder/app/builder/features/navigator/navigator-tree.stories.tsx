import type { Meta, StoryObj } from "@storybook/react";
import {
  Box,
  Flex,
  StorySection,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import { coreMetas } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { $instances, $pages, $props } from "~/shared/sync/data-stores";
import { $selectedPageId } from "~/shared/nano-states";
import { Label } from "~/builder/features/workspace/canvas-tools/outline/label";
import { Outline } from "~/builder/features/workspace/canvas-tools/outline/outline";
import { NavigatorTree } from "./navigator-tree";

const meta = {
  title: "Navigator/Navigator tree",
} satisfies Meta;

export default meta;

$registeredComponentMetas.set(
  new Map(Object.entries({ ...coreMetas, ...baseComponentMetas }))
);
$instances.set(
  new Map([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [{ type: "id", value: "slot" }],
      },
    ],
    [
      "slot",
      {
        type: "instance",
        id: "slot",
        component: "Slot",
        label: "Reusable Slot",
        children: [],
      },
    ],
  ])
);
$props.set(new Map());
$pages.set(createDefaultPages({ rootInstanceId: "body", homePageId: "home" }));
$selectedPageId.set("home");

const instanceRect = new DOMRect(24, 48, 192, 80);
const clampingRect = new DOMRect(0, 0, 240, 160);

export const ReusableInstance: StoryObj = {
  render: () => (
    <StorySection title="Reusable instance color">
      <Flex gap={5} align="start">
        <Box
          css={{
            width: theme.sizes.sidebarWidth,
            height: 160,
            backgroundColor: cssVar("--background-primary"),
          }}
        >
          <NavigatorTree />
        </Box>
        <Box
          css={{
            position: "relative",
            width: clampingRect.width,
            height: clampingRect.height,
            backgroundColor: cssVar("--background-primary"),
          }}
        >
          <Outline
            rect={instanceRect}
            clampingRect={clampingRect}
            variant="slot"
          >
            <Label
              instance={{ component: "Slot", label: "Reusable Slot" }}
              instanceRect={instanceRect}
              variant="slot"
            />
          </Outline>
        </Box>
      </Flex>
    </StorySection>
  ),
};
