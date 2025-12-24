import { PositionGrid } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { useComputedStyles } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";

// Map alignment keywords to position grid values (0, 50, 100)
const alignmentToPosition: Record<string, number> = {
  start: 0,
  center: 50,
  end: 100,
};

// Map position grid values to alignment keywords
const positionToAlignment: Record<number, string> = {
  0: "start",
  50: "center",
  100: "end",
};

export const GridAlignmentVisual = () => {
  const styles = useComputedStyles(["align-items", "justify-items"]);
  const [alignItems, justifyItems] = styles;
  const alignItemsValue = toValue(alignItems.cascadedValue);
  const justifyItemsValue = toValue(justifyItems.cascadedValue);

  // Get position values for PositionGrid, defaulting to center if not recognized
  const selectedPosition = {
    x: alignmentToPosition[justifyItemsValue] ?? 50,
    y: alignmentToPosition[alignItemsValue] ?? 50,
  };

  return (
    <PositionGrid
      selectedPosition={selectedPosition}
      onSelect={({ x, y }) => {
        const batch = createBatchUpdate();
        const justifyValue = positionToAlignment[x] ?? "center";
        const alignValue = positionToAlignment[y] ?? "center";

        batch.setProperty("justify-items")({
          type: "keyword",
          value: justifyValue,
        });
        batch.setProperty("align-items")({
          type: "keyword",
          value: alignValue,
        });
        batch.publish();
      }}
    />
  );
};
