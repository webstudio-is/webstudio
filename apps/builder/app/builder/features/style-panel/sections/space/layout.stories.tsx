import type { Meta } from "@storybook/react";
import { useState } from "react";
import {
  Box,
  Flex,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { SpaceLayout } from "./layout";
import { ValueText } from "../shared/value-text";

export default {
  title: "Style panel/Space",
} as Meta;

export const Layout = () => (
  <StorySection title="Layout">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Placeholder cells</Text>
        <Box css={{ width: theme.sizes.sidebarWidth }}>
          <SpaceLayout
            renderCell={() => <div style={{ color: "red" }}>·</div>}
            onHover={() => {}}
          />
        </Box>
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Value texts</Text>
        <ValueTextsSection />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Active properties</Text>
        <ActivePropertiesSection />
      </Flex>
    </Flex>
  </StorySection>
);

const allSources = [
  "local",
  "overwritten",
  "preset",
  "default",
  "remote",
] as const;
const allValues = [
  { type: "unit" as const, value: 0, unit: "px" as const },
  { type: "unit" as const, value: 10, unit: "rem" as const },
  { type: "unit" as const, value: 100, unit: "px" as const },
  { type: "unit" as const, value: 1000, unit: "px" as const },
  { type: "keyword" as const, value: "auto" },
  { type: "keyword" as const, value: "revert-layer" },
];

const ValueTextsSection = () => {
  const [_hovered, setHovered] = useState<{ property: string }>();
  return (
    <Flex direction="column" gap="5">
      {allSources.map((source) => (
        <Flex key={source} direction="column" gap="1">
          <Text variant="labels">Source: {source}</Text>
          <Box css={{ width: theme.sizes.sidebarWidth }}>
            <SpaceLayout
              onHover={setHovered}
              onClick={() => undefined}
              renderCell={() => (
                <ValueText
                  source={source}
                  value={{ type: "unit", value: 100, unit: "px" }}
                />
              )}
            />
          </Box>
        </Flex>
      ))}
      <Text variant="labels">Different values</Text>
      {allValues.map((value, index) => (
        <Flex key={index} direction="column" gap="1">
          <Text variant="mono" css={{ fontSize: 11 }}>
            {JSON.stringify(value)}
          </Text>
          <Box css={{ width: theme.sizes.sidebarWidth }}>
            <SpaceLayout
              onHover={setHovered}
              onClick={() => undefined}
              renderCell={() => <ValueText source="local" value={value} />}
            />
          </Box>
        </Flex>
      ))}
    </Flex>
  );
};

const ActivePropertiesSection = () => (
  <Flex direction="column" gap="5">
    <Flex direction="column" gap="1">
      <Text variant="labels">Active margin sides (top + bottom)</Text>
      <Box css={{ width: theme.sizes.sidebarWidth }}>
        <SpaceLayout
          onHover={() => {}}
          activeProperties={["margin-top", "margin-bottom"]}
          renderCell={() => (
            <ValueText
              source="local"
              value={{ type: "unit", value: 10, unit: "px" }}
            />
          )}
        />
      </Box>
    </Flex>
    <Flex direction="column" gap="1">
      <Text variant="labels">Active padding sides (left + right)</Text>
      <Box css={{ width: theme.sizes.sidebarWidth }}>
        <SpaceLayout
          onHover={() => {}}
          activeProperties={["padding-left", "padding-right"]}
          renderCell={() => (
            <ValueText
              source="local"
              value={{ type: "unit", value: 20, unit: "px" }}
            />
          )}
        />
      </Box>
    </Flex>
    <Flex direction="column" gap="1">
      <Text variant="labels">All properties active</Text>
      <Box css={{ width: theme.sizes.sidebarWidth }}>
        <SpaceLayout
          onHover={() => {}}
          activeProperties={[
            "margin-top",
            "margin-right",
            "margin-bottom",
            "margin-left",
            "padding-top",
            "padding-right",
            "padding-bottom",
            "padding-left",
          ]}
          renderCell={() => (
            <ValueText
              source="local"
              value={{ type: "unit", value: 8, unit: "px" }}
            />
          )}
        />
      </Box>
    </Flex>
  </Flex>
);
