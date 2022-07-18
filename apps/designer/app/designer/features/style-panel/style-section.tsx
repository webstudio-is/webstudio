import { useState } from "react";
import {
  Box,
  Flex,
  Grid,
  Label,
  Text,
  Button,
  Collapsible,
  Combobox,
  Comboicon,
  Select,
  IconButton,
} from "~/shared/design-system";
import {
  TriangleRightIcon,
  TriangleDownIcon,
  LockClosedIcon,
} from "~/shared/icons";
import * as icons from "~/shared/icons";
import type { StyleConfig } from "./lib/configs";
import {
  categories,
  type Style,
  type StyleProperty,
  type Category,
  type StyleValue,
} from "@webstudio-is/react-sdk";
import type { SetProperty } from "./lib/use-style-data";
import type { InheritedStyle } from "./lib/get-inherited-style";
import { ColorPicker } from "./lib/color-picker";
import {
  SpacingWidget,
  type SpacingProperty,
  type SpacingStyles,
} from "./lib/spacing-widget";
import { useIsFromCurrentBreakpoint } from "./lib/use-is-from-current-breakpoint";
import { propertyNameColorForSelectedBreakpoint } from "./lib/constants";
import camelcase from "lodash.camelcase";

const getFinalValue = ({
  currentStyle,
  inheritedStyle,
  property,
}: {
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  property: StyleProperty;
}): StyleValue | void => {
  const currentValue = currentStyle[property];
  const inheritedValue =
    property in inheritedStyle ? inheritedStyle[property].value : undefined;
  if (currentValue?.value === "inherit" && inheritedValue !== undefined) {
    return inheritedValue;
  }
  return currentValue;
};

type PropertyProps = {
  property: StyleProperty;
  label: string;
};

const PropertyName = ({ property, label }: PropertyProps) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);

  return (
    <Label
      css={{
        gridColumn: "1",
        color: isCurrentBreakpoint
          ? propertyNameColorForSelectedBreakpoint
          : "$hiContrast",
      }}
      variant="contrast"
      size="1"
      htmlFor={property}
    >
      {label}
    </Label>
  );
};

const Unit = ({ value }: { value: StyleValue }) => {
  if (value.type !== "unit" || value.unit === "number") return null;
  return (
    <Text
      css={{
        fontSize: "$1",
        cursor: "default",
      }}
    >
      {value.unit}
    </Text>
  );
};

type ControlProps = {
  setProperty: SetProperty;
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  styleConfig: StyleConfig;
};

const ColorControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  if (styleConfig.control !== "Color") return null;
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });
  if (value === undefined) return null;
  const setValue = setProperty(styleConfig.property);

  return (
    <Grid columns={2} align="center" gapX="1">
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <Flex align="center" css={{ gridColumn: "2/4" }} gap="1">
        <ColorPicker
          id={styleConfig.property}
          value={String(value.value)}
          onChange={(value) => {
            setValue(value, { isEphemeral: true });
          }}
          onChangeComplete={setValue}
        />
      </Flex>
    </Grid>
  );
};

const SpacingControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  if (styleConfig.control !== "Spacing") return null;

  const styles = categories.spacing.properties.reduce(
    (acc: SpacingStyles, property: SpacingProperty): SpacingStyles => {
      const value = getFinalValue({
        currentStyle,
        inheritedStyle,
        property,
      });
      if (value !== undefined) {
        if (property.includes("margin")) {
          acc.margins[property] = value;
        } else {
          acc.paddings[property] = value;
        }
      }

      return acc;
    },
    { margins: {}, paddings: {} } as SpacingStyles
  );

  return <SpacingWidget setProperty={setProperty} values={styles} />;
};

// @todo
// This is a cursor image for drag&drop value changing on the input by dragging horizontally
//const svgCursor =
//  '<svg width="15" height="15" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><path d="M8.00012 1.5C8.00012 1.22386 7.77626 1 7.50012 1C7.22398 1 7.00012 1.22386 7.00012 1.5V13.5C7.00012 13.7761 7.22398 14 7.50012 14C7.77626 14 8.00012 13.7761 8.00012 13.5V1.5ZM3.31812 5.818C3.49386 5.64227 3.49386 5.35734 3.31812 5.18161C3.14239 5.00587 2.85746 5.00587 2.68173 5.18161L0.681729 7.18161C0.505993 7.35734 0.505993 7.64227 0.681729 7.818L2.68173 9.818C2.85746 9.99374 3.14239 9.99374 3.31812 9.818C3.49386 9.64227 3.49386 9.35734 3.31812 9.18161L2.08632 7.9498H5.50017C5.7487 7.9498 5.95017 7.74833 5.95017 7.4998C5.95017 7.25128 5.7487 7.0498 5.50017 7.0498H2.08632L3.31812 5.818ZM12.3181 5.18161C12.1424 5.00587 11.8575 5.00587 11.6817 5.18161C11.506 5.35734 11.506 5.64227 11.6817 5.818L12.9135 7.0498H9.50017C9.25164 7.0498 9.05017 7.25128 9.05017 7.4998C9.05017 7.74833 9.25164 7.9498 9.50017 7.9498H12.9135L11.6817 9.18161C11.506 9.35734 11.506 9.64227 11.6817 9.818C11.8575 9.99374 12.1424 9.99374 12.3181 9.818L14.3181 7.818C14.4939 7.64227 14.4939 7.35734 14.3181 7.18161L12.3181 5.18161Z" fill="#fff"></path></svg>';

//const cursorUrl = `data:image/svg+xml;base64,${btoa(svgCursor)}`;

const ComboboxControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  if (styleConfig.control !== "Combobox") return null;

  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  return (
    <Grid columns={2} align="center" gapX="1">
      {/* @todo needs icon variant */}
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <Flex align="center" css={{ gridColumn: "2/4" }} gap="1">
        <Combobox
          id={styleConfig.property}
          items={styleConfig.items}
          variant="ghost"
          css={{
            // @todo drag&drop cursor to adjust numeric value
            // const cursorUrl = data:image/svg+xml;base64,${btoa(svgCursor)}
            //cursor: `url(${cursorUrl}), text`,
            textAlign: "right",
          }}
          state={value.type === "invalid" ? "invalid" : undefined}
          value={String(value.value)}
          onValueSelect={setValue}
          onValueEnter={setValue}
          onItemEnter={(value) => {
            setValue(value, { isEphemeral: true });
          }}
          onItemLeave={() => {
            setValue(String(value.value), { isEphemeral: true });
          }}
        />
        <Unit value={value} />
      </Flex>
    </Grid>
  );
};

const SelectControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  return (
    <>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />
      <Select
        options={styleConfig.items.map(({ label }) => label)}
        value={String(value.value)}
        onChange={setValue}
      />
    </>
  );
};

const ComboiconControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);
  const currentValue = value.value as string;
  const currentIconName = camelcase(
    `A${styleConfig.label} ${currentValue}`
  ).slice(1);
  const Icon = (icons as any)[currentIconName] || icons["AlignItemsCenter"];

  return (
    <IconButton>
      <Icon />
    </IconButton>
  );
  // return (
  //   <Comboicon
  //     id={styleConfig.property}
  //     items={styleConfig.items}
  //     value={String(value.value)}
  //     onChange={setValue}
  //   />
  // );
};

const GridControl = ({ currentStyle }: any) => {
  return <></>;
};

const ShowMore = ({ styleConfigs }: { styleConfigs: Array<JSX.Element> }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (styleConfigs.length === 0) return null;
  return (
    <Collapsible.Root asChild onOpenChange={setIsOpen}>
      <Flex direction="column" gap="3">
        <Collapsible.Trigger asChild>
          <Button css={{ width: "100%", gap: "$1" }}>
            {isOpen ? <TriangleDownIcon /> : <TriangleRightIcon />}Show more
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content asChild>
          <Flex direction="column" gap="3">
            {styleConfigs}
          </Flex>
        </Collapsible.Content>
      </Flex>
    </Collapsible.Root>
  );
};

type RenderPropertyProps = {
  setProperty: SetProperty;
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  styleConfig: StyleConfig;
  category: Category;
};

export const renderProperty = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
  category,
}: RenderPropertyProps) => {
  const Control = controls[styleConfig.control];
  const { property } = styleConfig;
  const key = category + "-" + property;
  return (
    <Box
      key={key}
      data-category={category}
      data-property={property}
      css={{ gridArea: property }}
    >
      <Control
        currentStyle={currentStyle}
        inheritedStyle={inheritedStyle}
        setProperty={setProperty}
        styleConfig={styleConfig}
      />
    </Box>
  );
};

// Categories should render themselves because most Categories will not be dump un-ordered lists with
// the new designs, refactor ColorControl, SpacingControl if needed.
export const renderCategory = ({
  category,
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: {
  category: Category;
  styleConfigsByCategory: JSX.Element[];
  moreStyleConfigsByCategory: JSX.Element[];
}) => {
  switch (category) {
    case "layout": {
      styleConfigsByCategory = [
        <Box
          key="grid"
          css={{
            gridArea: "grid",
            border: "1px solid black",
            background: "#CCC",
          }}
        >
          ...
          <br />
          ...
          <br />
          ...
        </Box>,
        <Box key="lock" css={{ gridArea: "lock" }}>
          <IconButton>
            <LockClosedIcon />
          </IconButton>
          ,
        </Box>,
        ...styleConfigsByCategory,
      ];
      return (
        <>
          <Grid
            css={{
              gridTemplateColumns: "repeat(12, 1fr);",
              gridTemplateRows: "auto auto auto auto",
              gridTemplateAreas: `
              "display display display display display display display display display display display display"
              "grid grid grid grid grid grid flexDirection flexDirection flexWrap flexWrap . ."
              "grid grid grid grid grid grid alignItems alignItems justifyContent justifyContent . ."
              "rowGap rowGap rowGap rowGap rowGap lock lock columnGap columnGap columnGap columnGap columnGap"
            `,
            }}
          >
            {styleConfigsByCategory}
          </Grid>
          <ShowMore styleConfigs={moreStyleConfigsByCategory} />
        </>
      );
    }
  }

  return (
    <>
      {styleConfigsByCategory}
      <ShowMore styleConfigs={moreStyleConfigsByCategory} />
    </>
  );
};

const controls: {
  [key: string]: (props: ControlProps) => JSX.Element | null;
} = {
  Color: ColorControl,
  Spacing: SpacingControl,
  Combobox: ComboboxControl,
  Comboicon: ComboiconControl,
  Select: SelectControl,
};
