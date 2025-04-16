import { useState } from "react";
import {
  EnhancedTooltip,
  Grid,
  SmallToggleButton,
  theme,
} from "@webstudio-is/design-system";
import {
  toValue,
  type CssProperty,
  type StyleValue,
  type TupleValue,
} from "@webstudio-is/css-engine";
import {
  Link2Icon,
  Link2UnlinkedIcon,
  XAxisIcon,
  YAxisIcon,
  ZAxisRotateIcon,
} from "@webstudio-is/icons";
import { CssValueInputContainer } from "~/builder/features/style-panel/shared/css-value-input";
import { $availableUnitVariables } from "~/builder/features/style-panel/shared/model";
import type { StyleUpdateOptions } from "~/builder/features/style-panel/shared/use-style-data";
import { FieldLabel } from "../../property-label";

const isTupleItem = (value: StyleValue): value is TupleValue["value"][number] =>
  value.type === "unit" || value.type === "var" || value.type === "unparsed";

export const transformProperties: CssProperty[] = [
  "translate",
  "scale",
  "rotate",
  "opacity",
];

// gap linked gap
const CONTROLS_GAP = 4 + 16 + 4;

export const AnimationTransforms = ({
  styles,
  onUpdate,
  onDelete,
}: {
  styles: Record<CssProperty, undefined | StyleValue>;
  onUpdate: (
    property: CssProperty,
    value: StyleValue,
    options?: StyleUpdateOptions
  ) => void;
  onDelete: (property: CssProperty, options?: StyleUpdateOptions) => void;
}) => {
  const [isScaleLinked, setIsScaleLinked] = useState(
    styles.scale?.type !== "tuple" ||
      toValue(styles.scale.value[0]) === toValue(styles.scale.value[1])
  );
  let translateX: StyleValue = { type: "unit", value: 0, unit: "px" };
  let translateY: StyleValue = { type: "unit", value: 0, unit: "px" };
  if (styles.translate?.type === "tuple") {
    [translateX, translateY = translateY] = styles.translate.value;
  }
  let scaleX: StyleValue = { type: "unit", value: 100, unit: "%" };
  let scaleY: StyleValue = { type: "unit", value: 100, unit: "%" };
  if (styles.scale?.type === "tuple") {
    [scaleX, scaleY = scaleY] = styles.scale.value;
  }
  let rotateZ: StyleValue = { type: "unit", value: 0, unit: "deg" };
  if (styles.rotate?.type === "tuple") {
    if (isTupleItem(styles.rotate.value[0])) {
      rotateZ = styles.rotate.value[0];
    }
  }
  return (
    <Grid gap={2} css={{ padding: theme.panel.padding }}>
      <Grid gap={1}>
        <FieldLabel
          resettable={styles.translate !== undefined}
          onReset={() => onDelete("translate")}
        >
          Translate
        </FieldLabel>
        <Grid columns={2} css={{ gap: CONTROLS_GAP }}>
          <CssValueInputContainer
            property="translate"
            styleSource={styles.translate ? "local" : "default"}
            icon={<XAxisIcon />}
            getOptions={() => $availableUnitVariables.get()}
            value={translateX}
            onUpdate={(value, options) => {
              if (value.type === "tuple") {
                onUpdate(
                  "translate",
                  { type: "tuple", value: [value.value[0], translateY] },
                  options
                );
              }
              // for scrabbing
              if (value.type === "unit") {
                onUpdate(
                  "translate",
                  { type: "tuple", value: [value, translateY] },
                  options
                );
              }
            }}
            onDelete={(options) => {
              const value = styles.translate ?? {
                type: "tuple",
                value: [translateX, translateY],
              };
              onUpdate("translate", value, options);
            }}
          />
          <CssValueInputContainer
            property="translate"
            styleSource={styles.translate ? "local" : "default"}
            icon={<YAxisIcon />}
            getOptions={() => $availableUnitVariables.get()}
            value={translateY}
            onUpdate={(value, options) => {
              if (value.type === "tuple") {
                onUpdate(
                  "translate",
                  { type: "tuple", value: [translateX, value.value[0]] },
                  options
                );
              }
              // for scrabbing
              if (value.type === "unit") {
                onUpdate(
                  "translate",
                  { type: "tuple", value: [translateX, value] },
                  options
                );
              }
            }}
            onDelete={(options) => {
              const value = styles.translate ?? {
                type: "tuple",
                value: [translateX, translateY],
              };
              onUpdate("translate", value, options);
            }}
          />
        </Grid>
      </Grid>

      <Grid gap={1}>
        <FieldLabel
          resettable={styles.scale !== undefined}
          onReset={() => onDelete("scale")}
        >
          Scale
        </FieldLabel>
        <Grid
          gap={1}
          align="center"
          css={{ gridTemplateColumns: "1fr 16px 1fr" }}
        >
          <CssValueInputContainer
            property="scale"
            styleSource={styles.scale ? "local" : "default"}
            icon={<XAxisIcon />}
            getOptions={() => $availableUnitVariables.get()}
            value={scaleX}
            onUpdate={(value, options) => {
              if (value.type === "tuple") {
                const newValue: StyleValue = {
                  type: "tuple",
                  value: isScaleLinked
                    ? [value.value[0], value.value[0]]
                    : [value.value[0], scaleY],
                };
                onUpdate("scale", newValue, options);
              }
              // for scrabbing
              if (value.type === "unit") {
                const newValue: StyleValue = {
                  type: "tuple",
                  value: isScaleLinked ? [value, value] : [value, scaleY],
                };
                onUpdate("scale", newValue, options);
              }
            }}
            onDelete={(options) => {
              if (isScaleLinked) {
                onDelete("scale", options);
              } else {
                const value = styles.scale ?? {
                  type: "tuple",
                  value: [scaleX, scaleY],
                };
                onUpdate("scale", value, options);
              }
            }}
          />
          <EnhancedTooltip
            content={isScaleLinked ? "Unlink scale axes" : "Link scale axes"}
          >
            <SmallToggleButton
              variant="normal"
              icon={isScaleLinked ? <Link2Icon /> : <Link2UnlinkedIcon />}
              pressed={isScaleLinked}
              onPressedChange={(isPressed) => {
                setIsScaleLinked(isPressed);
                if (isPressed) {
                  onUpdate("scale", {
                    type: "tuple",
                    value: [scaleX, scaleX],
                  });
                }
              }}
            />
          </EnhancedTooltip>
          <CssValueInputContainer
            property="scale"
            styleSource={styles.scale ? "local" : "default"}
            icon={<YAxisIcon />}
            getOptions={() => $availableUnitVariables.get()}
            value={scaleY}
            onUpdate={(value, options) => {
              if (value.type === "tuple") {
                const newValue: StyleValue = {
                  type: "tuple",
                  value: isScaleLinked
                    ? [value.value[0], value.value[0]]
                    : [scaleX, value.value[0]],
                };
                onUpdate("scale", newValue, options);
              }
              // for scrabbing
              if (value.type === "unit") {
                const newValue: StyleValue = {
                  type: "tuple",
                  value: isScaleLinked ? [value, value] : [scaleX, value],
                };
                onUpdate("scale", newValue, options);
              }
            }}
            onDelete={(options) => {
              if (isScaleLinked) {
                onDelete("scale", options);
              } else {
                const value = styles.scale ?? {
                  type: "tuple",
                  value: [scaleX, scaleY],
                };
                onUpdate("scale", value, options);
              }
            }}
          />
        </Grid>
      </Grid>

      <Grid columns={2} css={{ gap: CONTROLS_GAP }}>
        <Grid gap={1}>
          <FieldLabel
            resettable={styles.rotate !== undefined}
            onReset={() => onDelete("rotate")}
          >
            Rotate
          </FieldLabel>
          <CssValueInputContainer
            property="rotate"
            styleSource={styles.rotate ? "local" : "default"}
            icon={<ZAxisRotateIcon />}
            getOptions={() => $availableUnitVariables.get()}
            value={rotateZ}
            onUpdate={(value, options) => {
              if (value.type === "tuple" && isTupleItem(value.value[0])) {
                const [rotateZ] = value.value;
                onUpdate(
                  "rotate",
                  { type: "tuple", value: [rotateZ] },
                  options
                );
              } else if (isTupleItem(value)) {
                // for scrabbing
                onUpdate("rotate", { type: "tuple", value: [value] }, options);
              } else {
                onDelete("rotate", options);
              }
            }}
            onDelete={(options) => onDelete("rotate", options)}
          />
        </Grid>
        <Grid gap={1}>
          <FieldLabel
            resettable={styles.opacity !== undefined}
            onReset={() => onDelete("opacity")}
          >
            Opacity
          </FieldLabel>
          <CssValueInputContainer
            property="opacity"
            styleSource={styles.opacity ? "local" : "default"}
            getOptions={() => $availableUnitVariables.get()}
            value={styles.opacity ?? { type: "unit", value: 100, unit: "%" }}
            onUpdate={(value, options) => {
              onUpdate("opacity", value, options);
            }}
            onDelete={(options) => onDelete("opacity", options)}
          />
        </Grid>
      </Grid>
    </Grid>
  );
};
