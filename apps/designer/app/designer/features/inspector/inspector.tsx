import type { Publish } from "@webstudio-is/react-sdk";
import {
  __DEPRECATED__Text,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  Paragraph,
  Box,
} from "@webstudio-is/design-system";
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
  // boxShadow: "0 -1px 0 $colors$panelOutline",
};

export const Inspector = ({ publish }: InspectorProps) => {
  const [selectedInstanceData] = useSelectedInstanceData();

  if (selectedInstanceData === undefined) {
    return (
      <Box css={{ p: "$2", flexBasis: "100%" }}>
        {/* @todo: use this space for something more usefull: a-la figma's no instance selected sate, maybe create an issue with a more specific proposal? */}
        <Card css={{ p: "$3", mt: "$3", width: "100%" }}>
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
          <__DEPRECATED__Text>Style</__DEPRECATED__Text>
        </TabsTrigger>
        {/* @note: events would be part of props */}
        <TabsTrigger value="props">
          <__DEPRECATED__Text>Props</__DEPRECATED__Text>
        </TabsTrigger>
        <TabsTrigger value="inspect">
          <__DEPRECATED__Text>Inspect</__DEPRECATED__Text>
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
