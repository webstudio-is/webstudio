import { Flex, Text, IconButton } from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import { Card } from "./card";

export default {
  title: "Builder/Marketplace/Card",
  component: Card,
};

const placeholderImage = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="210">
    <rect width="400" height="210" fill="#c0d0e0"/>
    <text x="200" y="105" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-size="24" fill="#4a6a8a">400 × 210</text>
  </svg>`
)}`;

export const Card = () => (
  <Flex direction="column" gap="3" css={{ width: 300 }}>
    <Text variant="labels">Default</Text>
    <Card title="Section template" />

    <Text variant="labels">With image</Text>
    <Card
      title="Hero section"
      image={placeholderImage}
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
    <Card title="Loading card" image={placeholderImage} state="loading" />
  </Flex>
);
