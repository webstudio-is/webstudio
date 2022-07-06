import type { Publish } from "@webstudio-is/sdk";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  Paragraph,
  Box,
} from "apps/designer/app/shared/design-system";
import { StylePanel } from "apps/designer/app/designer/features/style-panel";
import { PropsPanel } from "apps/designer/app/designer/features/props-panel";
import { BrushIcon, GearIcon } from "apps/designer/app/shared/icons";
import { useSelectedInstanceData } from "apps/designer/app/designer/shared/nano-states";

type InspectorProps = {
  publish: Publish;
};

const contentStyle = {
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};

export const Inspector = ({ publish }: InspectorProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();

  if (selectedInstanceData === undefined) {
    return (
      <Box css={{ p: "$2" }}>
        <Card css={{ p: "$3", mt: "$3" }}>
          <Paragraph>Select an instance on the canvas</Paragraph>
        </Card>
      </Box>
    );
  }

  return (
    <Tabs defaultValue="style" css={{ width: "100%", gap: "$2" }}>
      <TabsList>
        <TabsTrigger value="style">
          <BrushIcon />
        </TabsTrigger>
        <TabsTrigger value="props">
          <GearIcon />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="style" css={contentStyle}>
        <StylePanel
          publish={publish}
          selectedInstanceData={selectedInstanceData}
        />
      </TabsContent>
      <TabsContent value="props" css={contentStyle}>
        <PropsPanel
          publish={publish}
          key={selectedInstanceData.id /* Re-render when instance changes */}
          selectedInstanceData={selectedInstanceData}
        />
      </TabsContent>
    </Tabs>
  );
};
