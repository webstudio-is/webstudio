import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useRef,
  useState,
} from "react";
import type { WsComponentPropsMeta } from "@webstudio-is/react-sdk";
import type { Prop } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";
import { SubtractIcon } from "@webstudio-is/icons";
import {
  SmallIconButton,
  Label as BaseLabel,
  useIsTruncated,
  Tooltip,
  Box,
  Flex,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";

export type PropMeta = WsComponentPropsMeta["props"][string];

export type PropValue = Prop extends infer T
  ? T extends { value: unknown; type: unknown }
    ? { value: T["value"]; type: T["type"] }
    : never
  : never;

// Weird code is to make type distributive
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
type PropMetaByControl<Control> = Control extends string
  ? Extract<PropMeta, { control: Control }>
  : never;

type PropByType<Type> = Type extends string
  ? Extract<Prop, { type: Type }>
  : never;

export type ControlProps<Control, PropType> = {
  meta: PropMetaByControl<Control>;
  // prop is optional because we don't have it when an intial prop is not set
  // and we don't want to show user something like a 0 for number when it's in fact not set to any value
  prop: PropByType<PropType> | undefined;
  propName: string;
  onChange: (value: PropValue, asset?: Asset) => void;
  onDelete?: () => void;
};

export const getLabel = (meta: { label?: string }, fallback: string) =>
  meta.label || humanizeString(fallback);

export const RemovePropButton = (props: { onClick: () => void }) => (
  <SmallIconButton icon={<SubtractIcon />} {...props} />
);

export const Label = ({
  children,
  ...rest
}: ComponentPropsWithoutRef<typeof BaseLabel> & { children: string }) => {
  const ref = useRef<HTMLLabelElement>(null);
  const truncated = useIsTruncated(ref, children);

  const label = (
    <BaseLabel truncate {...rest} ref={ref}>
      {children}
    </BaseLabel>
  );

  return truncated ? <Tooltip content={children}>{label}</Tooltip> : label;
};

/**
 * Return `[localValue, setLocalValue]` where `localValue` contains:
 *  - either the latest `savedValue`
 *  - or the latest value set via `setLocalValue`
 * (whichever changed most recently)
 */
export const useLocalValue = <Type,>(savedValue: Type) => {
  const [localValue, setLocalValue] = useState(savedValue);

  // Not using an effect to avoid re-rendering
  // https://beta.reactjs.org/reference/react/useState#storing-information-from-previous-renders
  const [previousSavedValue, setPreviousSavedValue] = useState(savedValue);
  if (previousSavedValue !== savedValue) {
    setLocalValue(savedValue);
    setPreviousSavedValue(savedValue);
  }

  return [localValue, setLocalValue] as const;
};

export const DefaultControlLayout = ({
  label,
  id,
  onDelete,
  children,
}: {
  label: string;
  id: string;
  onDelete?: () => void;
  children: ReactNode;
}) => (
  <Box>
    <Flex align="center" gap="1" justify="between">
      <Label htmlFor={id}>{label}</Label>
      {onDelete && <RemovePropButton onClick={onDelete} />}
    </Flex>
    {children}
  </Box>
);
