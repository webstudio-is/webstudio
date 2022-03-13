import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  Paragraph,
  Box,
} from "~/shared/design-system";
import { StylePanel } from "~/designer/style-panel";
import { SettingsPanel } from "~/designer/settings-panel";
import type { Publish } from "~/designer/iframe";
import type { SelectedInstanceData } from "~/shared/component";
import { BrushIcon, GearIcon } from "~/shared/icons";

type SidebarRightProps = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

const contentStyle = {
  height: "100%",
  overflow: "auto",
};

export const SidebarRight = ({
  publish,
  selectedInstanceData,
}: SidebarRightProps) => {
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
