import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  Paragraph,
  Box,
} from "~/shared/design-system";
import { StylePanel } from "~/designer/features/style-panel";
import { SettingsPanel } from "~/designer/features/settings-panel";
import type { Publish } from "~/designer/features/canvas-iframe";
import { BrushIcon, GearIcon } from "~/shared/icons";
import { useSelectedInstanceData } from "~/designer/shared/nano-values";

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
        <SettingsPanel
          publish={publish}
          selectedInstanceData={selectedInstanceData}
        />
      </TabsContent>
    </Tabs>
  );
};
