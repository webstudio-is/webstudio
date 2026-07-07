import { useState } from "react";
import { Flex } from "./flex";
import { Button } from "./button";
import { Progress as ProgressComponent } from "./progress";
import { Text } from "./text";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Progress",
  component: ProgressComponent,
};

export const Progress = () => {
  const [value, setValue] = useState(50);
  const [transitionValue, setTransitionValue] = useState(0);
  return (
    <>
      <StorySection title="Values">
        <StoryGrid css={{ width: 300 }}>
          {[0, 25, 50, 75, 100].map((v) => (
            <Flex key={v} gap="2" align="center">
              <Text css={{ width: 40 }}>{v}%</Text>
              <ProgressComponent value={v} />
            </Flex>
          ))}
          <Flex gap="2" align="center">
            <ProgressComponent value={value} />
            <Button onClick={() => setValue(Math.max(0, value - 10))}>
              -10
            </Button>
            <Button onClick={() => setValue(Math.min(100, value + 10))}>
              +10
            </Button>
          </Flex>
        </StoryGrid>
      </StorySection>
      <StorySection title="Custom transition">
        <StoryGrid css={{ width: 300 }}>
          <Text>Slow transition (1s)</Text>
          <ProgressComponent
            value={transitionValue}
            transitionDuration="1000ms"
          />
          <Flex gap="2">
            <Button onClick={() => setTransitionValue(0)}>0%</Button>
            <Button onClick={() => setTransitionValue(50)}>50%</Button>
            <Button onClick={() => setTransitionValue(100)}>100%</Button>
          </Flex>
        </StoryGrid>
      </StorySection>
    </>
  );
};
