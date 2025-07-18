import { Fragment, useId, useMemo, useRef, useState } from "react";
import {
  StyleValue,
  toValue,
  type CssProperty,
} from "@webstudio-is/css-engine";
import {
  Grid,
  Label,
  Tooltip,
  theme,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  FloatingPanel,
  CssValueListItem,
  SmallIconButton,
  CssValueListArrowFocus,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import type { AnimationKeyframe } from "@webstudio-is/sdk";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "~/builder/features/style-panel/shared/css-value-input";
import { CssEditor } from "~/builder/shared/css-editor";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { calcOffsets, findInsertionIndex, moveItem } from "./keyframe-helpers";
import {
  AnimationTransforms,
  transformProperties,
} from "./animation-transforms";

const unitOptions = [
  {
    id: "%" as const,
    label: "%",
    type: "unit" as const,
  },
];

const roundOffset = (value: number) => Math.round(value * 1000) / 10;

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
        value === undefined ? `auto (${roundOffset(placeholder)}%)` : "auto"
      }
      getOptions={() => []}
      unitOptions={unitOptions}
      intermediateValue={intermediateValue}
      styleSource="default"
      /* same as offset has 0 - 100% */
      property={"opacity"}
      value={
        value !== undefined
          ? { type: "unit", value: roundOffset(value), unit: "%" }
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
  index,
  offsetPlaceholder,
  onChange,
  onDelete,
}: {
  value: AnimationKeyframe;
  index: number;
  offsetPlaceholder: number;
  onChange: (value: AnimationKeyframe, isEphemeral: boolean) => void;
  onDelete: () => void;
}) => {
  const offsetId = useId();
  const declarations = useMemo(
    () =>
      (Object.keys(value.styles) as CssProperty[])
        // avoid duplicating transform properties in css editor
        .filter((property) => !transformProperties.includes(property))
        .map((property) => {
          const styleValue = value.styles[property];
          return {
            property,
            source: { name: "local" },
            cascadedValue: styleValue,
            computedValue: styleValue,
            usedValue: styleValue,
          } satisfies ComputedStyleDecl;
        }),
    [value.styles]
  );

  return (
    <FloatingPanel
      title="Keyframe"
      content={
        <Grid css={{ paddingBlock: theme.panel.paddingBlock }}>
          <Grid
            gap={1}
            align="center"
            css={{
              gridTemplateColumns: `1fr ${theme.spacing[22]}`,
              paddingInline: theme.panel.paddingInline,
            }}
          >
            <Label htmlFor={offsetId}>Offset</Label>
            <OffsetInput
              id={offsetId}
              value={value.offset}
              placeholder={offsetPlaceholder}
              onChange={(offset) => {
                onChange({ ...value, offset }, false);
              }}
            />
          </Grid>

          <AnimationTransforms
            styles={value.styles}
            onUpdate={(property, newValue, options) => {
              const styles = { ...value.styles, [property]: newValue };
              onChange({ ...value, styles }, options?.isEphemeral ?? false);
            }}
            onDelete={(property, options) => {
              if (options?.isEphemeral === true) {
                return;
              }
              const styles = { ...value.styles };
              delete styles[property];
              onChange({ ...value, styles }, false);
            }}
          />

          <CssEditor
            showSearch={false}
            showAddStyleInput
            propertiesPosition="top"
            virtualize={false}
            declarations={declarations}
            onAddDeclarations={(addedStyleMap) => {
              const styles = { ...value.styles };
              for (const [property, value] of addedStyleMap) {
                styles[property] = value;
              }
              onChange({ ...value, styles }, false);
            }}
            onDeleteProperty={(property, options = {}) => {
              if (options.isEphemeral === true) {
                return;
              }
              const styles = { ...value.styles };
              delete styles[property];
              onChange({ ...value, styles }, false);
            }}
            onSetProperty={(property) => {
              return (newValue, options) => {
                const styles = { ...value.styles, [property]: newValue };
                onChange({ ...value, styles }, options?.isEphemeral ?? false);
              };
            }}
            onDeleteAllDeclarations={() => {
              onChange({ ...value, styles: {} }, false);
            }}
          />
        </Grid>
      }
    >
      <CssValueListItem
        id={offsetPlaceholder.toString()}
        index={index}
        label={
          <Label truncate>
            {value.offset
              ? `${roundOffset(value.offset)}%`
              : `auto (${roundOffset(offsetPlaceholder)}%)`}
          </Label>
        }
        buttons={
          <Tooltip content="Remove keyframe">
            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              icon={<MinusIcon />}
              onClick={onDelete}
            />
          </Tooltip>
        }
      ></CssValueListItem>
    </FloatingPanel>
  );
};

export const Keyframes = ({
  value: keyframes,
  onChange,
}: {
  value: AnimationKeyframe[];
  onChange: ((value: undefined, isEphemeral: true) => void) &
    ((value: AnimationKeyframe[], isEphemeral: boolean) => void);
}) => {
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
    <div>
      <SectionTitle
        collapsible={false}
        suffix={
          <SectionTitleButton
            tabIndex={0}
            prefix={<PlusIcon />}
            onClick={() => {
              onChange(
                [...keyframes, { offset: undefined, styles: {} }],
                false
              );
              keyRefs.current = [...keyRefs.current, keyframes.length];
            }}
          />
        }
      >
        <SectionTitleLabel>Keyframes</SectionTitleLabel>
      </SectionTitle>
      <CssValueListArrowFocus>
        {keyframes.map((value, index) => (
          <Fragment key={keyRefs.current[index]}>
            <Keyframe
              value={value}
              index={index}
              offsetPlaceholder={offsets[index]}
              onChange={(newValue, isEphemeral) => {
                let newValues = [...keyframes];
                newValues[index] = newValue;

                const { offset } = newValue;
                if (offset === undefined) {
                  onChange(newValues, isEphemeral);
                  return;
                }

                const insertionIndex = findInsertionIndex(newValues, index);
                newValues = moveItem(newValues, index, insertionIndex);
                keyRefs.current = moveItem(
                  keyRefs.current,
                  index,
                  insertionIndex
                );

                onChange(newValues, isEphemeral);
              }}
              onDelete={() => {
                const newValues = [...keyframes];
                newValues.splice(index, 1);
                onChange(newValues, false);
              }}
            />
          </Fragment>
        ))}
      </CssValueListArrowFocus>
    </div>
  );
};
