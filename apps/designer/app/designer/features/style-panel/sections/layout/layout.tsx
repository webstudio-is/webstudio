import { useState } from "react";
import {
  Box,
  DeprecatedIconButton,
  EnhancedTooltip,
  Flex,
  Grid,
  Tooltip,
} from "@webstudio-is/design-system";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import {
  ColumnGapIcon,
  RowGapIcon,
  LinkedIcon,
  UnlinkedIcon,
} from "@webstudio-is/icons";
import type { RenderCategoryProps } from "../../style-sections";
import { FlexGrid } from "./shared/flex-grid";
import { renderProperty } from "../../style-sections";
import { MenuControl, SelectControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import { getStyleSource, type StyleInfo } from "../../shared/style-info";
import {
  type IntermediateStyleValue,
  CssValueInput,
} from "../../shared/css-value-input";
import { theme } from "@webstudio-is/design-system";

const GapLinked = ({
  isLinked,
  onChange,
}: {
  isLinked: boolean;
  onChange: (isLinked: boolean) => void;
}) => {
  return (
    <Tooltip
      content={isLinked ? "Unlink gap values" : "Link gap values"}
      delayDuration={400}
      disableHoverableContent={true}
    >
      <Flex
        css={{
          width: "100%",
          justifyContent: "center",
        }}
      >
        <DeprecatedIconButton onClick={() => onChange(isLinked === false)}>
          {isLinked ? <LinkedIcon /> : <UnlinkedIcon />}
        </DeprecatedIconButton>
      </Flex>
    </Tooltip>
  );
};

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
  const { label, items } = styleConfigByName[property];
  return (
    <EnhancedTooltip content={label}>
      <Box>
        <CssValueInput
          styleSource={getStyleSource(style[property])}
          icon={icon}
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
    </EnhancedTooltip>
  );
};

const FlexGap = ({
  style,
  createBatchUpdate,
}: {
  style: StyleInfo;
  createBatchUpdate: CreateBatchUpdate;
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
      }}
    >
      <Box css={{ gridArea: "columnGap" }}>
        <GapInput
          icon={<ColumnGapIcon />}
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

      <Box css={{ gridArea: "linked", px: theme.spacing[3] }}>
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
      </Box>

      <Box css={{ gridArea: "rowGap" }}>
        <GapInput
          icon={<RowGapIcon />}
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
      <Grid
        css={{
          gap: theme.spacing[5],
          gridTemplateColumns: `repeat(2, ${theme.spacing[13]}) repeat(3, ${theme.spacing[13]})`,
          gridTemplateRows: `repeat(2, ${theme.spacing[13]})`,
          gridTemplateAreas: `
            "grid grid flexDirection flexWrap ."
            "grid grid alignItems justifyContent alignContent"
          `,
          alignItems: "center",
        }}
      >
        <Box css={{ gridArea: "grid" }}>
          <FlexGrid currentStyle={currentStyle} batchUpdate={batchUpdate} />
        </Box>
        <Box css={{ gridArea: "flexDirection" }}>
          <MenuControl
            property="flexDirection"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        <Box css={{ gridArea: "flexWrap" }}>
          <MenuControl
            property="flexWrap"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        <Box css={{ gridArea: "alignItems" }}>
          <MenuControl
            property="alignItems"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        <Box css={{ gridArea: "justifyContent" }}>
          <MenuControl
            property="justifyContent"
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
        {showAlignContent && (
          <Box css={{ gridArea: "alignContent" }}>
            <MenuControl
              property="alignContent"
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Box>
        )}
      </Grid>

      <FlexGap style={currentStyle} createBatchUpdate={createBatchUpdate} />
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

const compareDisplayValues = (a: { name: string }, b: { name: string }) => {
  const aIndex = orderedDisplayValues.indexOf(a.name);
  const bIndex = orderedDisplayValues.indexOf(b.name);
  return aIndex - bIndex;
};

export const LayoutSection = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
  styleConfigsByCategory,
}: RenderCategoryProps) => {
  const displayValue = toValue(currentStyle.display?.value);

  const { label, items } = styleConfigByName.display;

  return (
    <>
      <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
        <PropertyName
          style={currentStyle}
          property="display"
          label={label}
          onReset={() => deleteProperty("display")}
        />
        <SelectControl
          property="display"
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          // show only important values first and hide others with scroll
          items={items
            .filter((item) => orderedDisplayValues.includes(item.name))
            .sort(compareDisplayValues)}
        />
      </Grid>

      {displayValue === "flex" || displayValue === "inline-flex" ? (
        <LayoutSectionFlex
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
        />
      ) : (
        styleConfigsByCategory.map((entry) =>
          // exclude display already rendered above
          entry.property === "display" ? null : renderProperty(entry)
        )
      )}
    </>
  );
};
