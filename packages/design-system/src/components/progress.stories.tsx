import { useState } from "react";
import { Flex } from "./flex";
import { Button } from "./button";
import { Progress } from "./progress";
import { Text } from "./text";

export default {
  title: "Progress",
  component: Progress,
};

export const Progress = () => {
  const [value, setValue] = useState(50);
  return (
    <Flex direction="column" gap="3" css={{ width: 300 }}>
      {[0, 25, 50, 75, 100].map((v) => (
        <Flex key={v} gap="2" align="center">
          <Text css={{ width: 40 }}>{v}%</Text>
          <Progress value={v} />
        </Flex>
      ))}
      <Flex gap="2" align="center">
        <Progress value={value} />
        <Button onClick={() => setValue(Math.max(0, value - 10))}>-10</Button>
        <Button onClick={() => setValue(Math.min(100, value + 10))}>+10</Button>
      </Flex>
    </Flex>
  );
};
