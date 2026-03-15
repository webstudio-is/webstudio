import { Flex } from "./flex";
import { Text } from "./text";
import { Card as CardComponent } from "./card";

export default {
  title: "Card",
  component: CardComponent,
};

export const Card = () => (
  <Flex gap="3" align="start">
    <CardComponent>
      <Text>Default</Text>
    </CardComponent>
    <CardComponent size="1">
      <Text>Size 1</Text>
    </CardComponent>
  </Flex>
);
