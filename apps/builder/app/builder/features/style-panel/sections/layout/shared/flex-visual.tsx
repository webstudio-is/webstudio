import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";
import { useComputedStyles } from "../../../shared/model";
import { getPriorityStyleValueSource } from "../../../property-label";
import { createBatchUpdate } from "../../../shared/use-style-data";
import { AlignmentUi } from "./alignment-ui";

export const FlexVisual = () => {
  const styles = useComputedStyles([
    "flex-direction",
    "justify-content",
    "align-items",
  ]);
  const styleValueSourceColor = getPriorityStyleValueSource(styles);
  const [flexDirection, justifyContent, alignItems] = styles;

  const flexDirectionValue = toValue(flexDirection.cascadedValue);
  const justifyContentValue = toValue(justifyContent.cascadedValue);
  const alignItemsValue = toValue(alignItems.cascadedValue);

  const isColumnDirection =
    flexDirectionValue === "column" || flexDirectionValue === "column-reverse";

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
      itemStretchWidth={false}
      itemStretchHeight={false}
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
