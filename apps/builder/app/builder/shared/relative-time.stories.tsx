import { Flex, StorySection, Text } from "@webstudio-is/design-system";
import { RelativeTime as RelativeTimeComponent } from "./relative-time";

export default {
  title: "Builder/Shared/Relative Time",
  component: RelativeTimeComponent,
};

export const RelativeTime = () => {
  const now = Date.now();
  const times = [
    { label: "Just now", date: new Date(now - 10_000) },
    { label: "5 minutes ago", date: new Date(now - 5 * 60_000) },
    { label: "1 hour ago", date: new Date(now - 60 * 60_000) },
    { label: "Yesterday", date: new Date(now - 24 * 60 * 60_000) },
    { label: "Last week", date: new Date(now - 7 * 24 * 60 * 60_000) },
  ];

  return (
    <StorySection title="Relative Time">
      <Flex direction="column" gap="2">
        {times.map(({ label, date }) => (
          <Flex key={label} gap="3" align="center">
            <Text variant="labels" css={{ width: 120 }}>
              {label}:
            </Text>
            <Text>
              <RelativeTimeComponent time={date} />
            </Text>
          </Flex>
        ))}
      </Flex>
    </StorySection>
  );
};
