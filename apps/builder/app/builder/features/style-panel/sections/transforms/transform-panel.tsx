import { Flex, theme } from "@webstudio-is/design-system";
import { TranslatePanelContent } from "./translate";
import { ScalePanelContent } from "./scale";
import { RotatePanelContent } from "./rotate";
import { SkewFloatingPanelContent } from "./skew";
import type { SetProperty } from "../../shared/use-style-data";
import { type TransformPanel } from "./transforms";
import type { TupleValue } from "@webstudio-is/css-engine";

type TransformPanelContentProps = {
  panel: TransformPanel;
  propertyValue: TupleValue;
  setProperty: SetProperty;
};

export const TransformPanelContent = (props: TransformPanelContentProps) => {
  const { panel } = props;

  return (
    <Flex direction="column">
      <Flex css={{ p: theme.spacing[9] }}>
        {panel === "translate" ? (
          <TranslatePanelContent {...props} />
        ) : undefined}
        {panel === "scale" ? <ScalePanelContent {...props} /> : undefined}
        {panel === "rotate" ? <RotatePanelContent {...props} /> : undefined}
        {panel === "skew" ? <SkewFloatingPanelContent {...props} /> : undefined}
      </Flex>
    </Flex>
  );
};
