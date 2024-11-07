import {
  theme,
  Box,
  Card,
  Text,
  Separator,
  ScrollArea,
} from "@webstudio-is/design-system";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { StyleSourcesSection } from "./style-source-section";
import { $selectedInstanceRenderState } from "~/shared/nano-states";
import { $selectedInstanceIntanceToTag } from "~/shared/nano-states";
import { sections } from "./sections";
import { toValue } from "@webstudio-is/css-engine";
import { useParentComputedStyleDecl } from "./shared/model";
import { $selectedInstance } from "~/shared/awareness";

const $selectedInstanceTag = computed(
  [$selectedInstance, $selectedInstanceIntanceToTag],
  (selectedInstance, instanceToTag) => {
    if (selectedInstance === undefined || instanceToTag === undefined) {
      return;
    }
    return instanceToTag.get(selectedInstance.id);
  }
);

export const StylePanel = () => {
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
      <ScrollArea>{all}</ScrollArea>
    </>
  );
};
