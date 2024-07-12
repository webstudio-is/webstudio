import type { TupleValue } from "@webstudio-is/css-engine";
import { Flex, Select, theme } from "@webstudio-is/design-system";
import type { TransformPanel } from "./utils";
import { transformPanels } from "./utils";
import { humanizeString } from "~/shared/string-utils";
import { Separator } from "~/builder/shared/assets";
import { useState } from "react";
import { TranslatePanelContent } from "./translate";
import { ScalePanelContent } from "./scale";
import { RotatePanelContent } from "./rotate";
import { SkewFloatingPanelContent } from "./skew";
import type { SetProperty } from "../../shared/use-style-data";

type TransformPanelContentProps = {
  panel: TransformPanel;
  value: TupleValue;
  setProperty: SetProperty;
};

export const TransformPanelContent = (props: TransformPanelContentProps) => {
  const { panel, value, setProperty } = props;
  const [selectedPanel, setSelectedPanel] = useState<TransformPanel>(panel);

  return (
    <Flex direction="column">
      <Flex css={{ px: theme.spacing[6], py: theme.spacing[9] }}>
        <Select
          fullWidth
          value={selectedPanel}
          options={Array.from(transformPanels)}
          getLabel={humanizeString}
          onChange={setSelectedPanel}
        />
      </Flex>
      <Separator />
      <Flex css={{ px: theme.spacing[6], py: theme.spacing[9] }}>
        {selectedPanel === "translate" ? (
          <TranslatePanelContent value={value} setProperty={setProperty} />
        ) : undefined}
        {selectedPanel === "scale" ? (
          <ScalePanelContent value={value} setProperty={setProperty} />
        ) : undefined}
        {selectedPanel === "rotate" ? (
          <RotatePanelContent value={value} setProperty={setProperty} />
        ) : undefined}
        {selectedPanel === "skew" ? (
          <SkewFloatingPanelContent value={value} setProperty={setProperty} />
        ) : undefined}
      </Flex>
    </Flex>
  );
};
