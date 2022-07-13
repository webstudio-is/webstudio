import type { Publish } from "@webstudio-is/sdk";
import {
  Text,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  Paragraph,
  Box,
} from "~/shared/design-system";
import { StylePanel } from "~/designer/features/style-panel";
import { PropsPanel } from "~/designer/features/props-panel";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";

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
        {/* @todo: use this space for something more usefull: a-la figma's no instance selected sate, maybe create an issue with a more specific proposal? */}
        <Card css={{ p: "$3", mt: "$3" }}>
          <Paragraph>Select an instance on the canvas</Paragraph>
        </Card>
      </Box>
    );
  }

  return (
    // @todo: Nit: I wonder if this width was supposed to be defined by the parent container layout
    <Tabs defaultValue="style" css={{ width: "100%" }}>
      <TabsList>
        <TabsTrigger value="style">
          <Text>Style</Text>
        </TabsTrigger>
        {/* @note: events would be part of props */}
        <TabsTrigger value="props">
          <Text>Props</Text>
        </TabsTrigger>
        <TabsTrigger value="inspect">
          <Text>Inspect</Text>
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
