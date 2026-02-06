import { useState } from "react";
import {
  Box,
  Flex,
  Grid,
  theme,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import type { CssProperty } from "@webstudio-is/css-engine";
import { StyleSection } from "../../shared/style-section";
import { PropertyLabel } from "../../property-label";
import { ToggleGroupTooltip } from "../../controls/toggle-group/toggle-group-control";

export const properties = [
  "grid-column-start",
  "grid-column-end",
  "grid-row-start",
  "grid-row-end",
  "align-self",
  "justify-self",
  "order",
] satisfies [CssProperty, ...CssProperty[]];

type PositionMode = "auto" | "area" | "manual";

export const Section = () => {
  const [positionMode, setPositionMode] = useState<PositionMode>("auto");

  return (
    <StyleSection label="Grid child" properties={properties}>
      <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
        <GridChildPositionMode
          value={positionMode}
          onChange={setPositionMode}
        />
        {positionMode === "auto" && <GridChildPositionAuto />}
        {positionMode === "area" && <GridChildPositionArea />}
        {positionMode === "manual" && <GridChildPositionManual />}
      </Flex>
    </StyleSection>
  );
};

const GridChildPositionMode = ({
  value,
  onChange,
}: {
  value: PositionMode;
  onChange: (value: PositionMode) => void;
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | undefined>();

  const items = [
    {
      value: "auto" as const,
      label: "Auto",
      description: "Let the grid automatically place this item.",
      code: "grid-column: auto;\ngrid-row: auto;",
    },
    {
      value: "area" as const,
      label: "Area",
      description: "Place the item in a named grid area.",
      code: "grid-area: <area-name>;",
    },
    {
      value: "manual" as const,
      label: "Manual",
      description: "Manually specify the item's position using grid lines.",
      code: "grid-column: <start> / <end>;\ngrid-row: <start> / <end>;",
    },
  ];

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyLabel
        label="Position"
        description="How the grid item is positioned within the grid"
        properties={["grid-column-start", "grid-row-start"]}
      />
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(newValue) => {
          if (newValue) {
            onChange(newValue as PositionMode);
          }
        }}
      >
        {items.map((item) => (
          <ToggleGroupTooltip
            key={item.value}
            isOpen={item.value === activeTooltip}
            onOpenChange={(isOpen) =>
              setActiveTooltip(isOpen ? item.value : undefined)
            }
            isSelected={item.value === value}
            label={item.label}
            code={item.code}
            description={item.description}
            properties={["grid-column-start", "grid-row-start"]}
          >
            <ToggleGroupButton
              value={item.value}
              onMouseEnter={() =>
                setActiveTooltip((prevValue) =>
                  prevValue === item.value ? prevValue : undefined
                )
              }
            >
              <Box css={{ paddingInline: theme.spacing[4] }}>{item.label}</Box>
            </ToggleGroupButton>
          </ToggleGroupTooltip>
        ))}
      </ToggleGroup>
    </Grid>
  );
};

const GridChildPositionAuto = () => {
  return null;
};

const GridChildPositionArea = () => {
  return null;
};

const GridChildPositionManual = () => {
  return null;
};
