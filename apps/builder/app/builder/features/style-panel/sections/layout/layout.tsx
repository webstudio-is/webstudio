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
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
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
  AICenterIcon,
  JCCenterIcon,
  ACCenterIcon,
  AIStartIcon,
  AIEndIcon,
  AIBaselineIcon,
  AIStretchIcon,
  JCStartIcon,
  JCEndIcon,
  JCSpaceBetweenIcon,
  JCSpaceAroundIcon,
  ACStartIcon,
  ACEndIcon,
  ACSpaceAroundIcon,
  ACSpaceBetweenIcon,
  ACStretchIcon,
} from "@webstudio-is/icons";
import { FlexGrid } from "./shared/flex-grid";
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
        onClick: (event) => {
          if (event.altKey) {
            event.preventDefault();
            onReset();
            return;
          }
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
  property: StyleProperty;
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
  const [columnGap, rowGap] = useComputedStyles(["columnGap", "rowGap"]);
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
          "columnGap linked rowGap"
        `,
        alignItems: "center",
      }}
    >
      <Box css={{ gridArea: "columnGap" }}>
        <GapInput
          icon={
            <GapHorizontalIcon
              onClick={(event) => {
                if (event.altKey) {
                  event.preventDefault();
                  deleteProperty("columnGap");
                  if (isLinked) {
                    deleteProperty("rowGap");
                  }
                }
              }}
            />
          }
          property="columnGap"
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
            batch.deleteProperty("columnGap");
            if (isLinked) {
              batch.deleteProperty("rowGap");
            }
            batch.publish();
          }}
          onPreviewChange={(value) => {
            const batch = createBatchUpdate();
            if (value === undefined) {
              batch.deleteProperty("columnGap");
              if (isLinked) {
                batch.deleteProperty("rowGap");
              }
            } else {
              batch.setProperty("columnGap")(value);
              if (isLinked) {
                batch.setProperty("rowGap")(value);
              }
            }
            batch.publish({ isEphemeral: true });
          }}
          onChange={(value) => {
            const batch = createBatchUpdate();
            batch.setProperty("columnGap")(value);
            if (isLinked) {
              batch.setProperty("rowGap")(value);
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
              batch.setProperty("rowGap")(columnGap.cascadedValue);
              batch.publish();
            } else if (isRowGapDefined) {
              const batch = createBatchUpdate();
              batch.setProperty("columnGap")(rowGap.cascadedValue);
              batch.publish();
            }
          }}
        />
      </Flex>

      <Box css={{ gridArea: "rowGap" }}>
        <GapInput
          icon={
            <GapVerticalIcon
              onClick={(event) => {
                if (event.altKey) {
                  event.preventDefault();
                  deleteProperty("rowGap");
                  if (isLinked) {
                    deleteProperty("columnGap");
                  }
                }
              }}
            />
          }
          property="rowGap"
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
            batch.deleteProperty("rowGap");
            if (isLinked) {
              batch.deleteProperty("columnGap");
            }
            batch.publish();
          }}
          onPreviewChange={(value) => {
            const batch = createBatchUpdate();
            if (value === undefined) {
              batch.deleteProperty("rowGap");
              if (isLinked) {
                batch.deleteProperty("columnGap");
              }
            } else {
              batch.setProperty("rowGap")(value);
              if (isLinked) {
                batch.setProperty("columnGap")(value);
              }
            }
            batch.publish({ isEphemeral: true });
          }}
          onChange={(value) => {
            const batch = createBatchUpdate();
            batch.setProperty("rowGap")(value);
            if (isLinked) {
              batch.setProperty("columnGap")(value);
            }
            batch.publish();
          }}
        />
      </Box>
    </Grid>
  );
};

const LayoutSectionFlex = () => {
  const flexWrap = useComputedStyleDecl("flexWrap");
  const flexWrapValue = toValue(flexWrap.cascadedValue);

  return (
    <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
      <Flex css={{ gap: theme.spacing[7] }} align="stretch">
        <FlexGrid />
        <Flex direction="column" justify="between">
          <Flex css={{ gap: theme.spacing[7] }}>
            <MenuControl
              property="flexDirection"
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
              property="flexWrap"
              items={[
                { name: "nowrap", label: "No Wrap", icon: NoWrapIcon },
                { name: "wrap", label: "Wrap", icon: WrapIcon },
              ]}
            />
          </Flex>
          <Flex css={{ gap: theme.spacing[7] }}>
            <MenuControl
              property="alignItems"
              items={[
                { name: "stretch", label: "Stretch", icon: AIStretchIcon },
                { name: "baseline", label: "Baseline", icon: AIBaselineIcon },
                { name: "center", label: "Center", icon: AICenterIcon },
                { name: "start", label: "Start", icon: AIStartIcon },
                { name: "end", label: "End", icon: AIEndIcon },
              ]}
            />
            <MenuControl
              property="justifyContent"
              items={[
                {
                  name: "space-between",
                  label: "Space Between",
                  icon: JCSpaceBetweenIcon,
                },
                {
                  name: "space-around",
                  label: "Space Around",
                  icon: JCSpaceAroundIcon,
                },
                { name: "center", label: "Center", icon: JCCenterIcon },
                { name: "start", label: "Start", icon: JCStartIcon },
                { name: "end", label: "End", icon: JCEndIcon },
              ]}
            />
            {(flexWrapValue === "wrap" || flexWrapValue === "wrap-reverse") && (
              <MenuControl
                property="alignContent"
                items={[
                  {
                    name: "space-between",
                    label: "Space Between",
                    icon: ACSpaceBetweenIcon,
                  },
                  {
                    name: "space-around",
                    label: "Space Around",
                    icon: ACSpaceAroundIcon,
                  },
                  { name: "stretch", label: "Stretch", icon: ACStretchIcon },
                  { name: "center", label: "Center", icon: ACCenterIcon },
                  { name: "start", label: "Start", icon: ACStartIcon },
                  { name: "end", label: "End", icon: ACEndIcon },
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
  "flexDirection",
  "flexWrap",
  "alignItems",
  "justifyContent",
  "alignContent",
  "rowGap",
  "columnGap",
] satisfies Array<StyleProperty>;

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
