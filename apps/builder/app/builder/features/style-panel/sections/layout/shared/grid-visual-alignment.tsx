import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";
import { useComputedStyles } from "../../../shared/model";
import { getPriorityStyleValueSource } from "../../../property-label";
import { createBatchUpdate } from "../../../shared/use-style-data";
import { AlignmentVisual } from "./alignment-visual";

export const GridVisualAlignment = () => {
  const styles = useComputedStyles([
    "grid-auto-flow",
    "justify-content",
    "justify-items",
    "align-items",
  ]);
  const styleValueSourceColor = getPriorityStyleValueSource(styles);
  const [gridAutoFlow, justifyContent, justifyItems, alignItems] = styles;

  const gridAutoFlowValue = toValue(gridAutoFlow.cascadedValue);
  const justifyContentValue = toValue(justifyContent.cascadedValue);
  const justifyItemsValue = toValue(justifyItems.cascadedValue);
  const alignItemsValue = toValue(alignItems.cascadedValue);

  const isColumnDirection = gridAutoFlowValue.includes("column");
  const isDense = gridAutoFlowValue.includes("dense");

  // Map grid properties to visual properties
  // justify-items:stretch stretches in inline direction (horizontal for row, vertical for column)
  const itemStretchWidth =
    !isColumnDirection && justifyItemsValue === "stretch";
  const itemStretchHeight =
    isColumnDirection && justifyItemsValue === "stretch";

  let color = theme.colors.foregroundFlexUiMain;
  if (styleValueSourceColor === "local") {
    color = theme.colors.foregroundLocalFlexUi;
  }
  if (styleValueSourceColor === "overwritten") {
    color = theme.colors.foregroundOverwrittenFlexUi;
  }
  if (styleValueSourceColor === "remote") {
    color = theme.colors.foregroundRemoteFlexUi;
  }

  const alignment = ["start", "center", "end"];

  return (
    <AlignmentVisual
      justifyContent={justifyContentValue}
      alignItems={alignItemsValue}
      isColumnDirection={isColumnDirection}
      isDense={isDense}
      color={color}
      itemStretchWidth={itemStretchWidth}
      itemStretchHeight={itemStretchHeight}
      onSelect={({ x, y }) => {
        const justifyContent = alignment[x];
        const alignItems = alignment[y];
        const batch = createBatchUpdate();
        batch.setProperty("align-items")({
          type: "keyword",
          value: alignItems,
        });
        batch.setProperty("justify-content")({
          type: "keyword",
          value: justifyContent,
        });
        batch.publish();
      }}
    />
  );
};
