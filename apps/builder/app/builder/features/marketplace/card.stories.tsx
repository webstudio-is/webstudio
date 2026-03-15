import { Flex, Text, IconButton } from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import { Card } from "./card";

export default {
  title: "Builder/Marketplace/Card",
  component: Card,
};

export const Demo = () => (
  <Flex direction="column" gap="3" css={{ width: 300 }}>
    <Text variant="labels">Default</Text>
    <Card title="Section template" />

    <Text variant="labels">With URL image</Text>
    <Card
      title="Hero section"
      image="https://placehold.co/400x210"
      suffix={
        <IconButton>
          <EllipsesIcon />
        </IconButton>
      }
    />

    <Text variant="labels">No image (placeholder)</Text>
    <Card title="Untitled" image="" />

    <Text variant="labels">Selected</Text>
    <Card title="Selected card" state="selected" />

    <Text variant="labels">Loading</Text>
    <Card
      title="Loading card"
      image="https://placehold.co/400x210"
      state="loading"
    />
  </Flex>
);
