import { parseCss } from "@webstudio-is/css-data";
import { StyleValue, toValue } from "@webstudio-is/css-engine";
import {
  Text,
  Grid,
  IconButton,
  Label,
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import type { AnimationKeyframe } from "@webstudio-is/sdk";
import { Fragment, useMemo, useState } from "react";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input";
import { toKebabCase } from "~/builder/features/style-panel/shared/keyword-utils";
import { CodeEditor } from "~/builder/shared/code-editor";
import { useIds } from "~/shared/form-utils";

const unitOptions = [
  {
    id: "%" as const,
    label: "%",
    type: "unit" as const,
  },
];

const OffsetInput = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      id={id}
      placeholder="auto"
      getOptions={() => []}
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      styleSource="default"
      /* same as offset has 0 - 100% */
      property={"fontStretch"}
      value={
        value !== undefined
          ? {
              type: "unit",
              value: Math.round(value * 1000) / 10,
              unit: "%",
            }
          : undefined
      }
      onChange={(styleValue) => {
        if (styleValue === undefined) {
          setIntermediateValue(styleValue);
          return;
        }

        const clampedStyleValue = { ...styleValue };
        if (
          clampedStyleValue.type === "unit" &&
          clampedStyleValue.unit === "%"
        ) {
          clampedStyleValue.value = Math.min(
            100,
            Math.max(0, clampedStyleValue.value)
          );
        }

        setIntermediateValue(clampedStyleValue);
      }}
      onHighlight={(_styleValue) => {
        /* @todo: think about preview */
      }}
      onChangeComplete={(event) => {
        setIntermediateValue(undefined);

        if (event.value.type === "unit" && event.value.unit === "%") {
          onChange(Math.min(100, Math.max(0, event.value.value)) / 100);
          return;
        }

        setIntermediateValue({
          type: "invalid",
          value: toValue(event.value),
        });
      }}
      onAbort={() => {
        /* @todo: allow to change some ephemeral property to see the result in action */
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        onChange(undefined);
      }}
    />
  );
};

const Keyframe = ({
  value,
  onChange,
}: {
  value: AnimationKeyframe;
  onChange: (value: AnimationKeyframe | undefined) => void;
}) => {
  const ids = useIds(["offset"]);

  const cssProperties = useMemo(() => {
    let result = ``;
    for (const [property, style] of Object.entries(value.styles)) {
      result = `${result}${toKebabCase(property)}: ${toValue(style)};\n`;
    }
    return result;
  }, [value.styles]);

  return (
    <>
      <Grid
        gap={1}
        align={"center"}
        css={{ gridTemplateColumns: "1fr 1fr auto" }}
      >
        <Label htmlFor={ids.offset}>Offset</Label>
        <OffsetInput
          id={ids.offset}
          value={value.offset}
          onChange={(offset) => {
            onChange({ ...value, offset });
          }}
        />
        <Tooltip content="Remove keyframe">
          <IconButton onClick={() => onChange(undefined)}>
            <MinusIcon />
          </IconButton>
        </Tooltip>
      </Grid>
      <Grid>
        <CodeEditor
          lang="css-properties"
          size="keyframe"
          value={cssProperties}
          onChange={() => {
            /* do nothing */
          }}
          onChangeComplete={(cssText) => {
            const parsedStyles = parseCss(`selector{${cssText}}`);
            onChange({
              ...value,
              styles: parsedStyles.reduce(
                (r, { property, value }) => ({ ...r, [property]: value }),
                {}
              ),
            });
          }}
        />
      </Grid>
    </>
  );
};

export const Keyframes = ({
  value: keyframes,
  onChange,
}: {
  value: AnimationKeyframe[];
  onChange: (value: AnimationKeyframe[]) => void;
}) => {
  const ids = useIds(["addKeyframe"]);

  return (
    <Grid gap={2}>
      <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "1fr auto" }}>
        <Label htmlFor={ids.addKeyframe}>
          <Text variant={"titles"}>Keyframes</Text>
        </Label>
        <IconButton
          id={ids.addKeyframe}
          onClick={() =>
            onChange([...keyframes, { offset: undefined, styles: {} }])
          }
        >
          <PlusIcon />
        </IconButton>
      </Grid>

      {keyframes.map((value, index) => (
        <Fragment key={index}>
          <Separator />
          <Keyframe
            key={index}
            value={value}
            onChange={(newValue) => {
              if (newValue === undefined) {
                const newValues = [...keyframes];
                newValues.splice(index, 1);
                onChange(newValues);
                return;
              }

              const newValues = [...keyframes];
              newValues[index] = newValue;
              onChange(newValues);
            }}
          />
        </Fragment>
      ))}
    </Grid>
  );
};
