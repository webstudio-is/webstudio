import { parseCss } from "@webstudio-is/css-data";
import { StyleValue, toValue } from "@webstudio-is/css-engine";
import {
  Text,
  Grid,
  IconButton,
  Label,
  Separator,
  Tooltip,
  ScrollArea,
  theme,
  Box,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import type { AnimationKeyframe } from "@webstudio-is/sdk";
import { Fragment, useMemo, useRef, useState } from "react";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input";
import { toKebabCase } from "~/builder/features/style-panel/shared/keyword-utils";
import { CodeEditor } from "~/builder/shared/code-editor";
import { useIds } from "~/shared/form-utils";
import { calcOffsets, findInsertionIndex, moveItem } from "./keyframe-helpers";

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
  placeholder,
  onChange,
}: {
  id: string;
  value: number | undefined;
  placeholder: number;
  onChange: (value: number | undefined) => void;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      id={id}
      placeholder={
        value === undefined
          ? `auto (${Math.round(placeholder * 1000) / 10}%)`
          : "auto"
      }
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
  offsetPlaceholder,
  onChange,
}: {
  value: AnimationKeyframe;
  offsetPlaceholder: number;
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
          placeholder={offsetPlaceholder}
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

  // To preserve focus on children swap
  const keyRefs = useRef(
    Array.from({ length: keyframes.length }, (_, index) => index)
  );

  if (keyframes.length !== keyRefs.current.length) {
    keyRefs.current = Array.from(
      { length: keyframes.length },
      (_, index) => index
    );
  }

  const offsets = calcOffsets(keyframes);

  return (
    <Grid
      css={{
        minHeight: 0,
      }}
      gap={1}
    >
      <Grid
        gap={1}
        align={"center"}
        css={{
          paddingInline: theme.panel.paddingInline,
          gridTemplateColumns: "1fr auto",
        }}
      >
        <Label htmlFor={ids.addKeyframe}>
          <Text variant={"titles"}>Keyframes</Text>
        </Label>
        <IconButton
          id={ids.addKeyframe}
          onClick={() => {
            onChange([...keyframes, { offset: undefined, styles: {} }]);
            keyRefs.current = [...keyRefs.current, keyframes.length];
          }}
        >
          <PlusIcon />
        </IconButton>
      </Grid>
      <Box
        css={{
          paddingInline: theme.panel.paddingInline,
        }}
      >
        <Separator />
      </Box>

      <ScrollArea>
        <Grid gap={2} css={{ padding: theme.panel.padding }}>
          {keyframes.map((value, index) => (
            <Fragment key={keyRefs.current[index]}>
              {index > 0 && <Separator />}
              <Keyframe
                key={keyRefs.current[index]}
                value={value}
                offsetPlaceholder={offsets[index]}
                onChange={(newValue) => {
                  if (newValue === undefined) {
                    const newValues = [...keyframes];
                    newValues.splice(index, 1);
                    onChange(newValues);
                    return;
                  }

                  let newValues = [...keyframes];
                  newValues[index] = newValue;

                  const { offset } = newValue;
                  if (offset === undefined) {
                    onChange(newValues);
                    return;
                  }

                  const insertionIndex = findInsertionIndex(newValues, index);
                  newValues = moveItem(newValues, index, insertionIndex);
                  keyRefs.current = moveItem(
                    keyRefs.current,
                    index,
                    insertionIndex
                  );

                  onChange(newValues);
                }}
              />
            </Fragment>
          ))}
        </Grid>
      </ScrollArea>
    </Grid>
  );
};
