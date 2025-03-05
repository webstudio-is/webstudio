import { useState, type JSX, type ReactNode } from "react";
import {
  theme,
  Box,
  EnhancedTooltip,
  Flex,
  Grid,
  SmallToggleButton,
  Tooltip,
} from "@webstudio-is/design-system";
import { propertyDescriptions } from "@webstudio-is/css-data";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import {
  Link2Icon,
  Link2UnlinkedIcon,
  GapHorizontalIcon,
  GapVerticalIcon,
  WrapIcon,
  NoWrapIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  AlignCenterHorizontalIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignContentCenterIcon,
  AlignStartHorizontalIcon,
  AlignEndHorizontalIcon,
  AlignBaselineIcon,
  StretchVerticalIcon,
  AlignHorizontalJustifyStartIcon,
  AlignHorizontalJustifyEndIcon,
  AlignHorizontalSpaceBetweenIcon,
  AlignHorizontalSpaceAroundIcon,
  AlignContentStartIcon,
  AlignContentEndIcon,
  AlignContentSpaceAroundIcon,
  AlignContentSpaceBetweenIcon,
  AlignContentStretchIcon,
} from "@webstudio-is/icons";
import { MenuControl, SelectControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { createBatchUpdate, deleteProperty } from "../../shared/use-style-data";
import { StyleSection } from "../../shared/style-section";
import {
  type IntermediateStyleValue,
  CssValueInput,
} from "../../shared/css-value-input";
import { ToggleControl } from "../../controls/toggle/toggle-control";
import { PropertyInfo, PropertyLabel } from "../../property-label";
import {
  useComputedStyles,
  useComputedStyleDecl,
  $availableUnitVariables,
} from "../../shared/model";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { FlexGrid } from "./shared/flex-grid";

const GapLinked = ({
  isLinked,
  onChange,
}: {
  isLinked: boolean;
  onChange: (isLinked: boolean) => void;
}) => (
  <EnhancedTooltip content={isLinked ? "Unlink gap values" : "Link gap values"}>
    <SmallToggleButton
      pressed={isLinked}
      onPressedChange={onChange}
      variant="normal"
      icon={isLinked ? <Link2Icon /> : <Link2UnlinkedIcon />}
    />
  </EnhancedTooltip>
);

const GapTooltip = ({
  label,
  styleDecl,
  onReset,
  children,
}: {
  label: string;
  styleDecl: ComputedStyleDecl;
  onReset: () => void;
  children: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const description = propertyDescriptions[styleDecl.property];
  return (
    <Tooltip
      open={isOpen}
      onOpenChange={setIsOpen}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick(event) {
          if (event.altKey) {
            event.preventDefault();
            onReset();
            return;
          }
          setIsOpen(true);
        },
      }}
      content={
        <PropertyInfo
          title={label}
          description={description}
          styles={[styleDecl]}
          onReset={() => {
            onReset();
            setIsOpen(false);
          }}
        />
      }
    >
      {children}
    </Tooltip>
  );
};

const GapInput = ({
  icon,
  property,
  styleDecl,
  intermediateValue,
  onIntermediateChange,
  onPreviewChange,
  onChange,
  onReset,
}: {
  icon: JSX.Element;
  property: CssProperty;
  styleDecl: ComputedStyleDecl;
  intermediateValue?: StyleValue | IntermediateStyleValue;
  onIntermediateChange: (value?: StyleValue | IntermediateStyleValue) => void;
  onPreviewChange: (value?: StyleValue) => void;
  onChange: (value: StyleValue) => void;
  onReset: () => void;
}) => {
  const { label, items } = styleConfigByName(property);

  return (
    <Box>
      <CssValueInput
        styleSource={styleDecl.source.name}
        icon={
          <GapTooltip label={label} styleDecl={styleDecl} onReset={onReset}>
            {icon}
          </GapTooltip>
        }
        property={property}
        value={styleDecl.cascadedValue}
        intermediateValue={intermediateValue}
        getOptions={() => [
          ...items.map((item) => ({
            type: "keyword" as const,
            value: item.name,
          })),
          ...$availableUnitVariables.get(),
        ]}
        onChange={(styleValue) => {
          onIntermediateChange(styleValue);
          if (styleValue === undefined) {
            onPreviewChange();
            return;
          }
          if (styleValue.type !== "intermediate") {
            onPreviewChange(styleValue);
          }
        }}
        onHighlight={(styleValue) => {
          if (styleValue !== undefined) {
            onPreviewChange(styleValue);
          } else {
            onPreviewChange();
          }
        }}
        onChangeComplete={({ value }) => {
          onChange(value);
          onIntermediateChange(undefined);
        }}
        onAbort={() => {
          onPreviewChange();
        }}
        onReset={() => {
          onIntermediateChange(undefined);
          onReset();
        }}
      />
    </Box>
  );
};

const FlexGap = () => {
  const [columnGap, rowGap] = useComputedStyles(["column-gap", "row-gap"]);
  const [isLinked, setIsLinked] = useState(
    () => toValue(columnGap.cascadedValue) === toValue(rowGap.cascadedValue)
  );

  const [intermediateColumnGap, setIntermediateColumnGap] = useState<
    StyleValue | IntermediateStyleValue
  >();
  const [intermediateRowGap, setIntermediateRowGap] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <Grid
      css={{
        gridTemplateColumns: "4fr 1fr 4fr",
        gridTemplateRows: "auto",
        gridTemplateAreas: `
          "column-gap linked row-gap"
        `,
        alignItems: "center",
      }}
    >
      <Box css={{ gridArea: "column-gap" }}>
        <GapInput
          icon={
            <GapHorizontalIcon
              onClick={(event) => {
                if (event.altKey) {
                  event.preventDefault();
                  deleteProperty("column-gap");
                  if (isLinked) {
                    deleteProperty("row-gap");
                  }
                }
              }}
            />
          }
          property="column-gap"
          styleDecl={columnGap}
          intermediateValue={intermediateColumnGap}
          onIntermediateChange={(value) => {
            setIntermediateColumnGap(value);
            if (isLinked) {
              setIntermediateRowGap(value);
            }
          }}
          onReset={() => {
            const batch = createBatchUpdate();
            batch.deleteProperty("column-gap");
            if (isLinked) {
              batch.deleteProperty("row-gap");
            }
            batch.publish();
          }}
          onPreviewChange={(value) => {
            const batch = createBatchUpdate();
            if (value === undefined) {
              batch.deleteProperty("column-gap");
              if (isLinked) {
                batch.deleteProperty("row-gap");
              }
            } else {
              batch.setProperty("column-gap")(value);
              if (isLinked) {
                batch.setProperty("row-gap")(value);
              }
            }
            batch.publish({ isEphemeral: true });
          }}
          onChange={(value) => {
            const batch = createBatchUpdate();
            batch.setProperty("column-gap")(value);
            if (isLinked) {
              batch.setProperty("row-gap")(value);
            }
            batch.publish();
          }}
        />
      </Box>

      <Flex css={{ gridArea: "linked", px: theme.spacing[3] }} justify="center">
        <GapLinked
          isLinked={isLinked}
          onChange={(isLinked) => {
            setIsLinked(isLinked);
            if (isLinked === false) {
              return;
            }
            const isColumnGapDefined =
              columnGap.source.name === "local" ||
              columnGap.source.name === "overwritten";
            const isRowGapDefined =
              rowGap.source.name === "local" ||
              rowGap.source.name === "overwritten";
            if (isColumnGapDefined) {
              const batch = createBatchUpdate();
              batch.setProperty("row-gap")(columnGap.cascadedValue);
              batch.publish();
            } else if (isRowGapDefined) {
              const batch = createBatchUpdate();
              batch.setProperty("column-gap")(rowGap.cascadedValue);
              batch.publish();
            }
          }}
        />
      </Flex>

      <Box css={{ gridArea: "row-gap" }}>
        <GapInput
          icon={
            <GapVerticalIcon
              onClick={(event) => {
                if (event.altKey) {
                  event.preventDefault();
                  deleteProperty("row-gap");
                  if (isLinked) {
                    deleteProperty("column-gap");
                  }
                }
              }}
            />
          }
          property="row-gap"
          styleDecl={rowGap}
          intermediateValue={intermediateRowGap}
          onIntermediateChange={(value) => {
            setIntermediateRowGap(value);
            if (isLinked) {
              setIntermediateColumnGap(value);
            }
          }}
          onReset={() => {
            const batch = createBatchUpdate();
            batch.deleteProperty("row-gap");
            if (isLinked) {
              batch.deleteProperty("column-gap");
            }
            batch.publish();
          }}
          onPreviewChange={(value) => {
            const batch = createBatchUpdate();
            if (value === undefined) {
              batch.deleteProperty("row-gap");
              if (isLinked) {
                batch.deleteProperty("column-gap");
              }
            } else {
              batch.setProperty("row-gap")(value);
              if (isLinked) {
                batch.setProperty("column-gap")(value);
              }
            }
            batch.publish({ isEphemeral: true });
          }}
          onChange={(value) => {
            const batch = createBatchUpdate();
            batch.setProperty("row-gap")(value);
            if (isLinked) {
              batch.setProperty("column-gap")(value);
            }
            batch.publish();
          }}
        />
      </Box>
    </Grid>
  );
};

const LayoutSectionFlex = () => {
  const flexWrap = useComputedStyleDecl("flex-wrap");
  const flexWrapValue = toValue(flexWrap.cascadedValue);

  return (
    <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
      <Flex css={{ gap: theme.spacing[7] }} align="stretch">
        <FlexGrid />
        <Flex direction="column" justify="between">
          <Flex css={{ gap: theme.spacing[7] }}>
            <MenuControl
              property="flex-direction"
              items={[
                { name: "row", label: "Row", icon: ArrowRightIcon },
                {
                  name: "row-reverse",
                  label: "Row Reverse",
                  icon: ArrowLeftIcon,
                },
                { name: "column", label: "Column", icon: ArrowDownIcon },
                {
                  name: "column-reverse",
                  label: "Column Reverse",
                  icon: ArrowUpIcon,
                },
              ]}
            />
            <ToggleControl
              property="flex-wrap"
              items={[
                { name: "nowrap", label: "No Wrap", icon: NoWrapIcon },
                { name: "wrap", label: "Wrap", icon: WrapIcon },
              ]}
            />
          </Flex>
          <Flex css={{ gap: theme.spacing[7] }}>
            <MenuControl
              property="align-items"
              items={[
                {
                  name: "stretch",
                  label: "Stretch",
                  icon: StretchVerticalIcon,
                },
                {
                  name: "baseline",
                  label: "Baseline",
                  icon: AlignBaselineIcon,
                },
                {
                  name: "center",
                  label: "Center",
                  icon: AlignCenterHorizontalIcon,
                },
                {
                  name: "start",
                  label: "Start",
                  icon: AlignStartHorizontalIcon,
                },
                { name: "end", label: "End", icon: AlignEndHorizontalIcon },
              ]}
            />
            <MenuControl
              property="justify-content"
              items={[
                {
                  name: "space-between",
                  label: "Space Between",
                  icon: AlignHorizontalSpaceBetweenIcon,
                },
                {
                  name: "space-around",
                  label: "Space Around",
                  icon: AlignHorizontalSpaceAroundIcon,
                },
                {
                  name: "center",
                  label: "Center",
                  icon: AlignHorizontalJustifyCenterIcon,
                },
                {
                  name: "start",
                  label: "Start",
                  icon: AlignHorizontalJustifyStartIcon,
                },
                {
                  name: "end",
                  label: "End",
                  icon: AlignHorizontalJustifyEndIcon,
                },
              ]}
            />
            {(flexWrapValue === "wrap" || flexWrapValue === "wrap-reverse") && (
              <MenuControl
                property="align-content"
                items={[
                  {
                    name: "space-between",
                    label: "Space Between",
                    icon: AlignContentSpaceBetweenIcon,
                  },
                  {
                    name: "space-around",
                    label: "Space Around",
                    icon: AlignContentSpaceAroundIcon,
                  },
                  {
                    name: "stretch",
                    label: "Stretch",
                    icon: AlignContentStretchIcon,
                  },
                  {
                    name: "center",
                    label: "Center",
                    icon: AlignContentCenterIcon,
                  },
                  {
                    name: "start",
                    label: "Start",
                    icon: AlignContentStartIcon,
                  },
                  { name: "end", label: "End", icon: AlignContentEndIcon },
                ]}
              />
            )}
          </Flex>
        </Flex>
      </Flex>

      <FlexGap />
    </Flex>
  );
};

const orderedDisplayValues = [
  "block",
  "flex",
  "inline-block",
  "inline-flex",
  "inline",
  "none",
];

export const properties = [
  "display",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "align-content",
  "row-gap",
  "column-gap",
] satisfies Array<CssProperty>;

export const Section = () => {
  const display = useComputedStyleDecl("display");
  const displayValue = toValue(display.cascadedValue);
  return (
    <StyleSection label="Layout" properties={properties}>
      <Flex direction="column" gap="2">
        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[24]}`,
            alignItems: "center",
          }}
        >
          <PropertyLabel
            label="Display"
            description={propertyDescriptions.display}
            properties={["display"]}
          />
          <SelectControl
            property="display"
            items={orderedDisplayValues.map((name) => ({ name, label: name }))}
          />
        </Grid>
        {(displayValue === "flex" || displayValue === "inline-flex") && (
          <LayoutSectionFlex />
        )}
      </Flex>
    </StyleSection>
  );
};
