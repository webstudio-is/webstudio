import { Flex } from "./flex";
import { Text } from "./text";
import { Card } from "./card";

export default {
  title: "Card",
  component: Card,
};

export const Card = () => (
  <Flex gap="3" align="start">
    <Card>
      <Text>Default</Text>
    </Card>
    <Card size="1">
      <Text>Size 1</Text>
    </Card>
  </Flex>
);
