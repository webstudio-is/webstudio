import { useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
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
  Kbd,
  Flex,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { EllipsesIcon } from "@webstudio-is/icons";
import { $selectedInstanceRenderState } from "~/shared/nano-states";
import { $selectedInstance } from "~/shared/awareness";
import { CollapsibleProvider } from "~/builder/shared/collapsible-section";
import {
  $settings,
  getSetting,
  setSetting,
  type Settings,
} from "~/builder/shared/client-settings";
import { sections } from "./sections";
import { StyleSourcesSection } from "./style-source-section";
import {
  $instanceTags,
  useComputedStyleDecl,
  useParentComputedStyleDecl,
} from "./shared/model";

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
  const value = getSetting("stylePanelMode");
  const [focusedValue, setFocusedValue] = useState<string>(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton>
          <EllipsesIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={Number.parseFloat(rawTheme.spacing[5])}
        css={{ width: theme.spacing[26] }}
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(value) => {
            setSetting("stylePanelMode", value as Settings["stylePanelMode"]);
          }}
        >
          <DropdownMenuRadioItem
            value="default"
            icon={<MenuCheckedIcon />}
            onFocus={() => setFocusedValue("default")}
          >
            Default
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="focus"
            icon={<MenuCheckedIcon />}
            onFocus={() => setFocusedValue("focus")}
          >
            <Flex justify="between" grow>
              <Text variant="labels">Focus mode</Text>
              <Kbd value={["alt", "shift", "s"]} />
            </Flex>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="advanced"
            icon={<MenuCheckedIcon />}
            onFocus={() => setFocusedValue("advanced")}
          >
            <Flex justify="between" grow>
              <Text variant="labels">Advanced mode</Text>
              <Kbd value={["alt", "shift", "a"]} />
            </Flex>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        {focusedValue === "default" && (
          <DropdownMenuItem hint>
            All sections are open by default.
          </DropdownMenuItem>
        )}
        {focusedValue === "focus" && (
          <DropdownMenuItem hint>
            Only one section is open at a time.
          </DropdownMenuItem>
        )}
        {focusedValue === "advanced" && (
          <DropdownMenuItem hint>Advanced section only.</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const StylePanel = () => {
  const { stylePanelMode } = useStore($settings);
  const selectedInstanceRenderState = useStore($selectedInstanceRenderState);
  const tag = useStore($selectedInstanceTag);
  const display = toValue(useComputedStyleDecl("display").computedValue);
  const parentDisplay = toValue(
    useParentComputedStyleDecl("display").computedValue
  );

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
    // In advanced mode we only need to show advanced panel
    if (stylePanelMode === "advanced" && category !== "advanced") {
      continue;
    }
    // show flex child UI only when parent is flex or inline-flex
    if (category === "flexChild" && parentDisplay.includes("flex") === false) {
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
    // non-replaced inline boxes cannot be transformed
    // https://drafts.csswg.org/css-transforms-1/#css-values
    if (
      category === "transforms" &&
      (display === "inline" ||
        display === "table-column" ||
        display === "table-column-group")
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
