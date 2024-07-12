import type { TupleValue } from "@webstudio-is/css-engine";
import { Flex, Select, theme } from "@webstudio-is/design-system";
import type { TransformPanel } from "./utils";
import { transformPanels } from "./utils";
import { humanizeString } from "~/shared/string-utils";
import { useState } from "react";

type TransformPanelContentProps = {
  panel: TransformPanel;
  value: TupleValue;
};

export const TransformPanelContent = (props: TransformPanelContentProps) => {
  const [selectedPanel, setSelectedPanel] = useState<TransformPanel>(
    props.panel
  );

  return (
    <Flex css={{ px: theme.spacing[6], py: theme.spacing[9] }}>
      <Select
        fullWidth
        value={selectedPanel}
        options={Array.from(transformPanels)}
        getLabel={humanizeString}
        onChange={(value) => {
          console.log(value);
          setSelectedPanel(value as TransformPanel);
        }}
      />
    </Flex>
  );
};
