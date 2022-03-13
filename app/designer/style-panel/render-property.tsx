import { useId } from "@radix-ui/react-id";
import {
  Flex,
  Grid,
  ToggleGroup,
  Label,
  Select,
  Text,
} from "~/shared/design-system";
import type { StyleConfig } from "~/shared/style-panel-configs";
import {
  Style,
  StyleProperty,
  StyleValue,
  Category,
  categories,
} from "@webstudio-is/sdk";
import type { SetProperty } from "./use-style-data";
import type { InheritedStyle } from "./get-inherited-style";
import { Autocomplete } from "./autocomplete";
import { ColorPicker } from "./color-picker";
import {
  SpacingWidget,
  type SpacingProperty,
  type SpacingStyles,
} from "./spacing-widget";

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

type RendererProps = {
  setProperty: SetProperty;
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  styleConfig: StyleConfig;
};

const renderers: {
  [key: string]: (props: RendererProps) => JSX.Element | null;
} = {};

renderers.ColorField = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}) => {
  if (styleConfig.ui !== "ColorField") return null;
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });
  if (value === undefined) return null;

  return (
    <Grid columns={2} align="center" gapX="1">
      <Label css={{ gridColumn: "1" }} size="1">
        {styleConfig.label}
      </Label>
      <Flex align="center" css={{ gridColumn: "2/4" }} gap="1">
        <ColorPicker
          value={String(value.value)}
          onChangeValue={setProperty(styleConfig.property)}
        />
      </Flex>
    </Grid>
  );
};

renderers.SpacingWidget = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}) => {
  if (styleConfig.ui !== "SpacingWidget") return null;

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

renderers.ToggleGroup = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}) => {
  if (styleConfig.ui !== "ToggleGroup") return null;
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });
  if (value === undefined) return null;

  return (
    <ToggleGroup.Root
      type="single"
      value={value.value as string}
      onValueChange={setProperty(styleConfig.property)}
    >
      {styleConfig.items.map(
        ({ name, label }: { name: string; label: string }) => (
          <ToggleGroup.Item
            css={{ fontSize: "$1", px: "$1" }}
            value={name}
            key={name}
          >
            {label}
          </ToggleGroup.Item>
        )
      )}
    </ToggleGroup.Root>
  );
};

renderers.Select = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}) => {
  const id = useId();
  if (styleConfig.ui !== "Select") return null;

  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  return (
    <Grid columns={2} align="center">
      <Label htmlFor={id} css={{ gridColumn: "1", fontSize: "$1" }}>
        {styleConfig.label}
      </Label>
      <Select
        id={id}
        css={{ gridColumn: "2/4" }}
        value={value.value}
        onChange={(event) => {
          setProperty(styleConfig.property)(event.target.value);
        }}
      >
        {styleConfig.items.map(({ name }: { name: string }) => (
          <option value={name} key={name}>
            {name}
          </option>
        ))}
      </Select>
    </Grid>
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

const svgCursor =
  '<svg width="15" height="15" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"><path d="M8.00012 1.5C8.00012 1.22386 7.77626 1 7.50012 1C7.22398 1 7.00012 1.22386 7.00012 1.5V13.5C7.00012 13.7761 7.22398 14 7.50012 14C7.77626 14 8.00012 13.7761 8.00012 13.5V1.5ZM3.31812 5.818C3.49386 5.64227 3.49386 5.35734 3.31812 5.18161C3.14239 5.00587 2.85746 5.00587 2.68173 5.18161L0.681729 7.18161C0.505993 7.35734 0.505993 7.64227 0.681729 7.818L2.68173 9.818C2.85746 9.99374 3.14239 9.99374 3.31812 9.818C3.49386 9.64227 3.49386 9.35734 3.31812 9.18161L2.08632 7.9498H5.50017C5.7487 7.9498 5.95017 7.74833 5.95017 7.4998C5.95017 7.25128 5.7487 7.0498 5.50017 7.0498H2.08632L3.31812 5.818ZM12.3181 5.18161C12.1424 5.00587 11.8575 5.00587 11.6817 5.18161C11.506 5.35734 11.506 5.64227 11.6817 5.818L12.9135 7.0498H9.50017C9.25164 7.0498 9.05017 7.25128 9.05017 7.4998C9.05017 7.74833 9.25164 7.9498 9.50017 7.9498H12.9135L11.6817 9.18161C11.506 9.35734 11.506 9.64227 11.6817 9.818C11.8575 9.99374 12.1424 9.99374 12.3181 9.818L14.3181 7.818C14.4939 7.64227 14.4939 7.35734 14.3181 7.18161L12.3181 5.18161Z" fill="#fff"></path></svg>';

const cursorUrl = `data:image/svg+xml;base64,${btoa(svgCursor)}`;

renderers.TextFieldWithAutocomplete = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}) => {
  if (styleConfig.ui !== "TextFieldWithAutocomplete") return null;

  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  return (
    <Grid columns={2} align="center" gapX="1">
      <Label css={{ gridColumn: "1" }} size="1">
        {styleConfig.label}
      </Label>
      <Flex align="center" css={{ gridColumn: "2/4" }} gap="1">
        <Autocomplete
          items={styleConfig.items}
          variant="ghost"
          css={{
            // @todo drag&drop cursor to adjust numeric value
            //cursor: `url(${cursorUrl}), text`,
            textAlign: "right",
          }}
          state={value.type === "invalid" ? "invalid" : undefined}
          value={String(value.value)}
          onChangeValue={setProperty(styleConfig.property)}
        />
        <Unit value={value} />
      </Flex>
    </Grid>
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
  const Renderer = renderers[styleConfig.ui];

  return (
    <Renderer
      key={category + "-" + styleConfig.property}
      currentStyle={currentStyle}
      inheritedStyle={inheritedStyle}
      setProperty={setProperty}
      styleConfig={styleConfig}
    />
  );
};
