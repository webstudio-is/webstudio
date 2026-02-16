import { theme } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { useComputedStyles } from "../../../shared/model";
import { getPriorityStyleValueSource } from "../../../property-label";
import { createBatchUpdate } from "../../../shared/use-style-data";
import { AlignmentUi } from "./alignment-ui";

export const GridAlignment = () => {
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

  // For grid, justify-items controls item alignment within cells
  // When stretch, items fill the track width (row) or height (column)
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
    <AlignmentUi
      justifyContent={justifyContentValue}
      alignItems={alignItemsValue}
      isColumnDirection={isColumnDirection}
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
