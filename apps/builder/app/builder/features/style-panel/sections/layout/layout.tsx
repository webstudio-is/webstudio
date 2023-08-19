import { useState, type ReactNode } from "react";
import {
  Box,
  EnhancedTooltip,
  Flex,
  Grid,
  SmallToggleButton,
  ToggleButton,
} from "@webstudio-is/design-system";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import {
  Link2Icon,
  Link2UnlinkedIcon,
  GapHorizontalIcon,
  GapVerticalIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  WrapIcon,
  NoWrapIcon,
} from "@webstudio-is/icons";
import type { RenderCategoryProps } from "../../style-sections";
import { FlexGrid } from "./shared/flex-grid";
import { MenuControl, SelectControl } from "../../controls";
import { PropertyName, PropertyTooltip } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import { getStyleSource, type StyleInfo } from "../../shared/style-info";
import { CollapsibleSection } from "../../shared/collapsible-section";
import {
  type IntermediateStyleValue,
  CssValueInput,
} from "../../shared/css-value-input";
import { theme } from "@webstudio-is/design-system";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

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
}: {
  icon: JSX.Element;
  style: StyleInfo;
  property: StyleProperty;
  intermediateValue?: StyleValue | IntermediateStyleValue;
  onIntermediateChange: (value?: StyleValue | IntermediateStyleValue) => void;
  onPreviewChange: (value?: StyleValue) => void;
  onChange: (value: StyleValue) => void;
}) => {
  const { label, items } = styleConfigByName(property);
  return (
    <Box>
      <CssValueInput
        styleSource={getStyleSource(style[property])}
        icon={<EnhancedTooltip content={label}>{icon}</EnhancedTooltip>}
        property="columnGap"
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
  deleteProperty: RenderCategoryProps["deleteProperty"];
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

const Toggle = ({
  property,
  iconOn,
  iconOff,
  valueOn,
  valueOff,
  currentStyle,
  setProperty,
  deleteProperty,
}: {
  property: StyleProperty;
  iconOn: ReactNode;
  iconOff: ReactNode;
  valueOn: string;
  valueOff: string;
  currentStyle: RenderCategoryProps["currentStyle"];
  setProperty: RenderCategoryProps["setProperty"];
  deleteProperty: RenderCategoryProps["deleteProperty"];
}) => {
  const { label } = styleConfigByName(property);
  const styleValue = currentStyle[property]?.value;
  const isPressed =
    styleValue?.type === "keyword" && styleValue?.value === valueOn;

  return (
    <PropertyTooltip
      title={label}
      properties={[property]}
      style={currentStyle}
      onReset={() => deleteProperty(property)}
    >
      <ToggleButton
        pressed={isPressed}
        onPressedChange={(isPressed) => {
          setProperty(property)({
            type: "keyword",
            value: isPressed ? valueOn : valueOff,
          });
        }}
        variant={getStyleSource(currentStyle[property])}
      >
        {isPressed ? iconOn : iconOff}
      </ToggleButton>
    </PropertyTooltip>
  );
};

const LayoutSectionFlex = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
}: {
  currentStyle: RenderCategoryProps["currentStyle"];
  setProperty: RenderCategoryProps["setProperty"];
  deleteProperty: RenderCategoryProps["deleteProperty"];
  createBatchUpdate: RenderCategoryProps["createBatchUpdate"];
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
            <Toggle
              property="flexDirection"
              iconOn={<ArrowDownIcon />}
              iconOff={<ArrowRightIcon />}
              valueOn="column"
              valueOff="row"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
            <Toggle
              property="flexWrap"
              iconOn={<WrapIcon />}
              iconOff={<NoWrapIcon />}
              valueOn="wrap"
              valueOff="nowrap"
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

const properties: StyleProperty[] = [
  "display",
  "flexDirection",
  "flexWrap",
  "alignItems",
  "justifyContent",
  "alignContent",
  "rowGap",
  "columnGap",
];

export const LayoutSection = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
}: RenderCategoryProps) => {
  const displayValue = toValue(currentStyle.display?.value);

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

        {(displayValue === "flex" || displayValue === "inline-flex") && (
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
