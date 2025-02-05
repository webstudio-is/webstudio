import {
  theme,
  Box,
  Card,
  Text,
  Separator,
  ScrollArea,
  DropdownMenu,
  DropdownMenuTrigger,
  IconButton,
  DropdownMenuContent,
  DropdownMenuRadioItem,
  MenuCheckedIcon,
  DropdownMenuRadioGroup,
  rawTheme,
} from "@webstudio-is/design-system";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { StyleSourcesSection } from "./style-source-section";
import { $selectedInstanceRenderState } from "~/shared/nano-states";
import { sections } from "./sections";
import { toValue } from "@webstudio-is/css-engine";
import { $instanceTags, useParentComputedStyleDecl } from "./shared/model";
import { $selectedInstance } from "~/shared/awareness";
import { CollapsibleProvider } from "~/builder/shared/collapsible-section";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { EllipsesIcon } from "@webstudio-is/icons";
import {
  $settings,
  getSetting,
  setSetting,
  type Settings,
} from "~/builder/shared/client-settings";

const $selectedInstanceTag = computed(
  [$selectedInstance, $instanceTags],
  (selectedInstance, instanceTags) => {
    if (selectedInstance === undefined) {
      return;
    }
    return instanceTags.get(selectedInstance.id);
  }
);

export const ModeMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton>
          <EllipsesIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={Number.parseFloat(rawTheme.spacing[5])}>
        <DropdownMenuRadioGroup
          value={getSetting("stylePanelMode")}
          onValueChange={(value) => {
            setSetting("stylePanelMode", value as Settings["stylePanelMode"]);
          }}
        >
          <DropdownMenuRadioItem value="default" icon={<MenuCheckedIcon />}>
            Default
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="focus" icon={<MenuCheckedIcon />}>
            Focus mode
          </DropdownMenuRadioItem>
          {/*
          <DropdownMenuRadioItem value="advanced" icon={<MenuCheckedIcon />}>
            Advanced mode
          </DropdownMenuRadioItem> */}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const StylePanel = () => {
  const { stylePanelMode } = useStore($settings);
  const selectedInstanceRenderState = useStore($selectedInstanceRenderState);
  const tag = useStore($selectedInstanceTag);
  const display = useParentComputedStyleDecl("display");
  const displayValue = toValue(display.computedValue);

  // If selected instance is not rendered on the canvas,
  // style panel will not work, because it needs the element in DOM in order to work.
  // See <SelectedInstanceConnector> for more details.
  if (selectedInstanceRenderState === "notMounted") {
    return (
      <Box css={{ p: theme.spacing[5] }}>
        <Card css={{ p: theme.spacing[9], width: "100%" }}>
          <Text>Select an instance on the canvas</Text>
        </Card>
      </Box>
    );
  }

  const all = [];

  for (const [category, { Section }] of sections.entries()) {
    // show flex child UI only when parent is flex or inline-flex
    if (category === "flexChild" && displayValue.includes("flex") === false) {
      continue;
    }
    // allow customizing list item type only for list and list item
    if (
      category === "listItem" &&
      tag !== "ul" &&
      tag !== "ol" &&
      tag !== "li"
    ) {
      continue;
    }
    all.push(<Section key={category} />);
  }

  return (
    <>
      <Box css={{ padding: theme.panel.padding }}>
        <Text variant="titles" css={{ paddingBlock: theme.panel.paddingBlock }}>
          Style Sources
        </Text>
        <StyleSourcesSection />
      </Box>
      <Separator />
      <ScrollArea>
        <CollapsibleProvider
          accordion={stylePanelMode === "focus"}
          initialOpen={stylePanelMode === "focus" ? "Layout" : "*"}
        >
          {all}
        </CollapsibleProvider>
      </ScrollArea>
    </>
  );
};
