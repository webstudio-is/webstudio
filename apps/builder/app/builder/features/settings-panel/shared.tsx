import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useRef,
  useState,
  useEffect,
} from "react";
import equal from "fast-deep-equal";
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
  Grid,
  theme,
  type CSS,
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
  instanceId: string;
  meta: PropMetaByControl<Control>;
  // prop is optional because we don't have it when an intial prop is not set
  // and we don't want to show user something like a 0 for number when it's in fact not set to any value
  prop: PropByType<PropType> | undefined;
  propName: string;
  onChange: (value: PropValue, asset?: Asset) => void;
  onDelete?: () => void;

  // Should be called when we want to delete the prop,
  // but want to keep it in the list until panel is closed
  onSoftDelete: () => void;
};

export const getLabel = (meta: { label?: string }, fallback: string) =>
  meta.label || humanizeString(fallback);

export const RemovePropButton = (props: { onClick: () => void }) => (
  <SmallIconButton icon={<SubtractIcon />} variant="destructive" {...props} />
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

export const useLocalValue = <Type,>(
  savedValue: Type,
  onSave: (value: Type) => void
) => {
  const localValueRef = useRef(savedValue);

  const [_, setRefresh] = useState(0);

  const save = () => {
    if (equal(localValueRef.current, savedValue) === false) {
      // To synchronize with setState immediately followed by save
      onSave(localValueRef.current);
    }
  };

  const setLocalValue = (value: Type) => {
    localValueRef.current = value;
    setRefresh((refresh) => refresh + 1);
  };

  // onBlur will not trigger if control is unmounted when props panel is closed or similar.
  // So we're saving at the unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => save, []);

  return {
    /**
     * Contains:
     *  - either the latest `savedValue`
     *  - or the latest value set via `set()`
     * (whichever changed most recently)
     */
    value: localValueRef.current,
    /**
     * Should be called on onChange or similar event
     */
    set: setLocalValue,
    /**
     * Should be called on onBlur or similar event
     */
    save,
  };
};

type LayoutProps = {
  label: string;
  id?: string;
  labelSize?: "default" | "large";
  onDelete?: () => void;
  children: ReactNode;
};

export const VerticalLayout = ({
  label,
  id,
  onDelete,
  children,
}: LayoutProps) => (
  <Box>
    <Flex align="center" gap="1" justify="between">
      <Label htmlFor={id}>{label}</Label>
      {onDelete && <RemovePropButton onClick={onDelete} />}
    </Flex>
    {children}
  </Box>
);

export const HorizontalLayout = ({
  label,
  id,
  labelSize = "default",
  onDelete,
  children,
}: LayoutProps) => (
  <Grid
    css={{
      gridTemplateColumns: `${
        labelSize === "default" ? theme.spacing[19] : theme.spacing[24]
      } 1fr`,
      minHeight: theme.spacing[13],
    }}
    align="center"
    gap="2"
  >
    <Label htmlFor={id}>{label}</Label>
    <Grid
      css={{
        gridTemplateColumns: `1fr`,
        gridAutoFlow: "column",
        gridAutoColumns: "auto",
      }}
      align="center"
      gap="2"
    >
      {children}
      {onDelete && <RemovePropButton onClick={onDelete} />}
    </Grid>
  </Grid>
);

export const Row = ({ children, css }: { children: ReactNode; css?: CSS }) => (
  <Flex css={{ px: theme.spacing[9], ...css }} gap="2" direction="column">
    {children}
  </Flex>
);
