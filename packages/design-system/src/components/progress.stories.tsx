import { useState } from "react";
import { Flex } from "./flex";
import { Button } from "./button";
import { Progress } from "./progress";

export default {
  title: "Progress",
  component: Progress,
};

export const Default = () => <Progress value={50} />;

export const Empty = () => <Progress value={0} />;

export const Full = () => <Progress value={100} />;

export const Steps = () => (
  <Flex direction="column" gap="5">
    <Progress value={0} />
    <Progress value={25} />
    <Progress value={50} />
    <Progress value={75} />
    <Progress value={100} />
  </Flex>
);

export const Interactive = () => {
  const [value, setValue] = useState(30);
  return (
    <Flex direction="column" gap="5" align="start">
      <Progress value={value} />
      <Flex gap="3">
        <Button onClick={() => setValue(Math.max(0, value - 10))}>-10</Button>
        <Button onClick={() => setValue(Math.min(100, value + 10))}>+10</Button>
      </Flex>
    </Flex>
  );
};
