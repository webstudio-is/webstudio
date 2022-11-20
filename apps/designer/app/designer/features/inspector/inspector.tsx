import { lazy, Suspense } from "react";
import type { Publish } from "~/shared/pubsub";
import {
  Text,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  Paragraph,
  Box,
} from "@webstudio-is/design-system";
import { useSelectedInstanceData } from "~/designer/shared/nano-states";

const StylePanel = lazy(() => import("~/designer/features/style-panel"));
const PropsPanel = lazy(() => import("~/designer/features/props-panel"));

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
      <Box css={{ p: "$spacing$5", flexBasis: "100%" }}>
        {/* @todo: use this space for something more usefull: a-la figma's no instance selected sate, maybe create an issue with a more specific proposal? */}
        <Card css={{ p: "$spacing$9", mt: "$spacing$9", width: "100%" }}>
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
        <Suspense fallback={null}>
          <StylePanel
            publish={publish}
            selectedInstanceData={selectedInstanceData}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="props" css={contentStyle}>
        <Suspense fallback={null}>
          <PropsPanel
            publish={publish}
            key={selectedInstanceData.id /* Re-render when instance changes */}
            selectedInstanceData={selectedInstanceData}
          />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};
