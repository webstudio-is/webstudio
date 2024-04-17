import { useState } from "react";
import {
  Box,
  EnhancedTooltip,
  Flex,
  Grid,
  SmallToggleButton,
} from "@webstudio-is/design-system";
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
import type { SectionProps } from "../shared/section";
import { FlexGrid } from "./shared/flex-grid";
import { MenuControl, SelectControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import { getStyleSource, type StyleInfo } from "../../shared/style-info";
import { CollapsibleSection } from "../../shared/collapsible-section";
import {
  type IntermediateStyleValue,
  CssValueInput,
} from "../../shared/css-value-input";
import { theme } from "@webstudio-is/design-system";
import { TooltipContent } from "../../../style-panel/shared/property-name";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { ToggleControl } from "../../controls/toggle/toggle-control";

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

const GapInput = ({
  icon,
  style,
  property,
  intermediateValue,
  onIntermediateChange,
  onPreviewChange,
  onChange,
  onReset,
}: {
  icon: JSX.Element;
  style: StyleInfo;
  property: StyleProperty;
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
        styleSource={getStyleSource(style[property])}
        icon={
          <EnhancedTooltip
            content={
              <TooltipContent
                title={label}
                style={style}
                properties={[property]}
                onReset={onReset}
              />
            }
          >
            {icon}
          </EnhancedTooltip>
        }
        property={property}
        value={style[property]?.value}
        intermediateValue={intermediateValue}
        keywords={items.map((item) => ({
          type: "keyword",
          value: item.name,
        }))}
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
      />
    </Box>
  );
};

const FlexGap = ({
  style,
  createBatchUpdate,
  deleteProperty,
}: {
  style: StyleInfo;
  createBatchUpdate: CreateBatchUpdate;
  deleteProperty: SectionProps["deleteProperty"];
}) => {
  const batchUpdate = createBatchUpdate();

  const [isLinked, setIsLinked] = useState(() => {
    return toValue(style.columnGap?.value) === toValue(style.rowGap?.value);
  });

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
        height: theme.spacing[13],
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
          style={style}
          property="columnGap"
          intermediateValue={intermediateColumnGap}
          onIntermediateChange={(value) => {
            setIntermediateColumnGap(value);
            if (isLinked) {
              setIntermediateRowGap(value);
            }
          }}
          onReset={() => {
            batchUpdate.deleteProperty("columnGap");
            if (isLinked) {
              batchUpdate.deleteProperty("rowGap");
            }
            batchUpdate.publish();
          }}
          onPreviewChange={(value) => {
            if (value === undefined) {
              batchUpdate.deleteProperty("columnGap");
              if (isLinked) {
                batchUpdate.deleteProperty("rowGap");
              }
            } else {
              batchUpdate.setProperty("columnGap")(value);
              if (isLinked) {
                batchUpdate.setProperty("rowGap")(value);
              }
            }
            batchUpdate.publish({ isEphemeral: true });
          }}
          onChange={(value) => {
            batchUpdate.setProperty("columnGap")(value);
            if (isLinked) {
              batchUpdate.setProperty("rowGap")(value);
            }
            batchUpdate.publish();
          }}
        />
      </Box>

      <Flex css={{ gridArea: "linked", px: theme.spacing[3] }} justify="center">
        <GapLinked
          isLinked={isLinked}
          onChange={(isLinked) => {
            setIsLinked(isLinked);
            if (isLinked && style.columnGap?.value) {
              batchUpdate.setProperty("rowGap")(style.columnGap.value);
              batchUpdate.publish();
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
          style={style}
          property="rowGap"
          intermediateValue={intermediateRowGap}
          onIntermediateChange={(value) => {
            setIntermediateRowGap(value);
            if (isLinked) {
              setIntermediateColumnGap(value);
            }
          }}
          onReset={() => {
            batchUpdate.deleteProperty("rowGap");
            if (isLinked) {
              batchUpdate.deleteProperty("columnGap");
            }
            batchUpdate.publish();
          }}
          onPreviewChange={(value) => {
            if (value === undefined) {
              batchUpdate.deleteProperty("rowGap");
              if (isLinked) {
                batchUpdate.deleteProperty("columnGap");
              }
            } else {
              batchUpdate.setProperty("rowGap")(value);
              if (isLinked) {
                batchUpdate.setProperty("columnGap")(value);
              }
            }
            batchUpdate.publish({ isEphemeral: true });
          }}
          onChange={(value) => {
            batchUpdate.setProperty("rowGap")(value);
            if (isLinked) {
              batchUpdate.setProperty("columnGap")(value);
            }
            batchUpdate.publish();
          }}
        />
      </Box>
    </Grid>
  );
};

const mapNormalTo = (
  style: StyleInfo,
  property: StyleProperty,
  newValue: string
): StyleInfo => {
  const styleInfoValue = style[property]?.value;
  if (styleInfoValue?.type === "keyword" && styleInfoValue.value === "normal") {
    return {
      ...style,
      [property]: {
        ...style[property],
        value: { type: "keyword", value: newValue },
      },
    };
  }
  return style;
};

const LayoutSectionFlex = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
}: {
  currentStyle: SectionProps["currentStyle"];
  setProperty: SectionProps["setProperty"];
  deleteProperty: SectionProps["deleteProperty"];
  createBatchUpdate: SectionProps["createBatchUpdate"];
}) => {
  const batchUpdate = createBatchUpdate();

  const flexWrapValue = currentStyle.flexWrap?.value;

  // From design: Notice that the align-content icon button is not visible by default.
  // This property only applies when flex-wrap is set to "wrap".
  const showAlignContent =
    flexWrapValue?.type === "keyword" &&
    (flexWrapValue.value === "wrap" || flexWrapValue.value === "wrap-reverse");

  return (
    <Flex css={{ flexDirection: "column", gap: theme.spacing[5] }}>
      <Flex css={{ gap: theme.spacing[7] }} align="stretch">
        <FlexGrid currentStyle={currentStyle} batchUpdate={batchUpdate} />
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
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
            <ToggleControl
              property="flexWrap"
              items={[
                {
                  name: "nowrap",
                  label: "No Wrap",
                  icon: NoWrapIcon,
                },
                {
                  name: "wrap",
                  label: "Wrap",
                  icon: WrapIcon,
                },
              ]}
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Flex>
          <Flex css={{ gap: theme.spacing[7] }}>
            <MenuControl
              property="alignItems"
              currentStyle={mapNormalTo(currentStyle, "alignItems", "stretch")}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
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
              currentStyle={mapNormalTo(
                currentStyle,
                "justifyContent",
                "start"
              )}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
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
            {showAlignContent && (
              <MenuControl
                property="alignContent"
                currentStyle={mapNormalTo(
                  currentStyle,
                  "alignContent",
                  "stretch"
                )}
                setProperty={setProperty}
                deleteProperty={deleteProperty}
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

      <FlexGap
        style={currentStyle}
        createBatchUpdate={createBatchUpdate}
        deleteProperty={deleteProperty}
      />
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

if (isFeatureEnabled("displayContents")) {
  orderedDisplayValues.push("contents");
}

const compareDisplayValues = (a: { name: string }, b: { name: string }) => {
  const aIndex = orderedDisplayValues.indexOf(a.name);
  const bIndex = orderedDisplayValues.indexOf(b.name);
  return aIndex - bIndex;
};

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

export const Section = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
}: SectionProps) => {
  const value = toValue(currentStyle.display?.value);

  const { label, items } = styleConfigByName("display");
  return (
    <CollapsibleSection
      label="Layout"
      currentStyle={currentStyle}
      properties={properties}
    >
      <Flex direction="column" gap="2">
        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[24]}`,
            height: theme.spacing[13],
            alignItems: "center",
          }}
        >
          <PropertyName
            style={currentStyle}
            properties={["display"]}
            label={label}
            onReset={() => deleteProperty("display")}
          />
          <SelectControl
            property="display"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
            items={items
              .filter((item) => orderedDisplayValues.includes(item.name))
              .sort(compareDisplayValues)}
          />
        </Grid>

        {(value === "flex" || value === "inline-flex") && (
          <LayoutSectionFlex
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
            createBatchUpdate={createBatchUpdate}
          />
        )}
      </Flex>
    </CollapsibleSection>
  );
};
