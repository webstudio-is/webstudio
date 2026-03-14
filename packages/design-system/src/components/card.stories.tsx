import { Text } from "./text";
import { Card } from "./card";

export default {
  title: "Card",
  component: Card,
};

export const Default = () => (
  <Card>
    <Text>Card content goes here</Text>
  </Card>
);

export const Size1 = () => (
  <Card size="1">
    <Text>Card with size 1</Text>
  </Card>
);
