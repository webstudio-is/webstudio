import { atom, computed, type ReadableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useRef,
  useState,
  useEffect,
  useMemo,
  type ComponentProps,
} from "react";
import equal from "fast-deep-equal";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  type PropMeta,
} from "@webstudio-is/react-sdk";
import type { Prop, Asset } from "@webstudio-is/sdk";
import { HelpIcon, SubtractIcon } from "@webstudio-is/icons";
import {
  SmallIconButton,
  Label as BaseLabel,
  useIsTruncated,
  Tooltip,
  Box,
  Flex,
  Grid,
  Text,
  theme,
  rawTheme,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import {
  $dataSourceVariables,
  $dataSources,
  $selectedInstanceSelector,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import type { BindingVariant } from "~/builder/shared/binding-popover";
import { useDebouncedCallback } from "use-debounce";

export type PropValue =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "json"; value: unknown }
  | { type: "string[]"; value: string[] }
  | { type: "expression"; value: string }
  | { type: "asset"; value: Asset["id"] }
  | { type: "page"; value: Extract<Prop, { type: "page" }>["value"] }
  | { type: "action"; value: Extract<Prop, { type: "action" }>["value"] };

// Weird code is to make type distributive
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
type PropMetaByControl<Control> = Control extends string
  ? Extract<PropMeta, { control: Control }>
  : never;

export type ControlProps<Control> = {
  instanceId: string;
  meta: PropMetaByControl<Control>;
  // prop is optional because we don't have it when an intial prop is not set
  // and we don't want to show user something like a 0 for number when it's in fact not set to any value
  prop: Prop | undefined;
  propName: string;
  computedValue: unknown;
  deletable: boolean;
  onChange: (value: PropValue, asset?: Asset) => void;
  onDelete: () => void;
};

export const getLabel = (meta: { label?: string }, fallback: string) =>
  meta.label || humanizeString(fallback);

export const RemovePropButton = (props: { onClick: () => void }) => (
  <SmallIconButton icon={<SubtractIcon />} variant="destructive" {...props} />
);

const SimpleLabel = ({
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

type LabelProps = ComponentPropsWithoutRef<typeof BaseLabel> & {
  htmlFor?: string;
  children: string;
  description?: string;
  openOnClick?: boolean;
  readOnly?: boolean;
};

export const Label = ({
  htmlFor,
  children,
  description,
  openOnClick = false,
  readOnly,
  ...rest
}: LabelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  let label: ReactNode;

  if (description == null) {
    label = <SimpleLabel htmlFor={htmlFor}>{children}</SimpleLabel>;
  } else {
    label = (
      <Tooltip
        open={isOpen}
        onOpenChange={setIsOpen}
        content={
          <Flex
            direction="column"
            gap="2"
            css={{ maxWidth: theme.spacing[28] }}
          >
            <Text variant="titles">{children}</Text>
            <Text>{description}</Text>
          </Flex>
        }
      >
        <BaseLabel truncate htmlFor={htmlFor} {...rest}>
          {children}
        </BaseLabel>
      </Tooltip>
    );
  }

  return (
    <Flex align="center" css={{ gap: theme.spacing[3] }}>
      {label}
      {readOnly && (
        <Tooltip
          content={
            "The value is controlled by an expression and cannot be changed."
          }
          variant="wrapped"
        >
          <HelpIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
        </Tooltip>
      )}
    </Flex>
  );
};

export const useLocalValue = <Type,>(
  savedValue: Type,
  onSave: (value: Type) => void,
  { autoSave = true } = {}
) => {
  const isEditingRef = useRef(false);
  const localValueRef = useRef(savedValue);

  const [_, setRefresh] = useState(0);

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const save = () => {
    isEditingRef.current = false;
    if (equal(localValueRef.current, savedValue) === false) {
      // To synchronize with setState immediately followed by save
      onSaveRef.current(localValueRef.current);
    }
  };

  const saveDebounced = useDebouncedCallback(save, 500);

  const setLocalValue = (value: Type) => {
    isEditingRef.current = true;
    localValueRef.current = value;
    setRefresh((refresh) => refresh + 1);
    if (autoSave) {
      saveDebounced();
    }
  };

  // onBlur will not trigger if control is unmounted when props panel is closed or similar.
  // So we're saving at the unmount
  // store save in ref to access latest saved value from render
  // instead of stale one
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    // access ref in the moment of unmount
    return () => saveRef.current();
  }, []);

  useEffect(() => {
    // Update local value if saved value changes and control is not in edit mode.
    if (
      isEditingRef.current === false &&
      localValueRef.current !== savedValue
    ) {
      localValueRef.current = savedValue;
      setRefresh((refresh) => refresh + 1);
    }
  }, [savedValue]);

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
  label: ReturnType<typeof Label>;
  deletable: boolean;
  onDelete: () => void;
  children: ReactNode;
};

export const VerticalLayout = ({
  label,
  deletable,
  onDelete,
  children,
}: LayoutProps) => (
  <Box>
    <Grid
      css={{
        gridTemplateColumns: deletable ? `1fr max-content` : `1fr`,
        justifyItems: "start",
      }}
      align="center"
      gap="1"
      justify="between"
    >
      {label}
      {deletable && <RemovePropButton onClick={onDelete} />}
    </Grid>
    <Box css={{ py: theme.spacing[2] }}>{children}</Box>
  </Box>
);

export const HorizontalLayout = ({
  label,
  deletable,
  onDelete,
  children,
}: LayoutProps) => (
  <Grid
    css={{
      gridTemplateColumns: deletable
        ? `${theme.spacing[19]} 1fr max-content`
        : `${theme.spacing[19]} 1fr`,
      minHeight: theme.spacing[13],
    }}
    align="center"
    gap="2"
  >
    {label}
    {children}
    {deletable && <RemovePropButton onClick={onDelete} />}
  </Grid>
);

export const ResponsiveLayout = ({
  label,
  deletable,
  onDelete,
  children,
}: LayoutProps) => {
  // more than 9 characters in label trigger ellipsis
  // might not cover all cases though
  if (label.props.children.length <= 8) {
    return (
      <HorizontalLayout label={label} deletable={deletable} onDelete={onDelete}>
        {children}
      </HorizontalLayout>
    );
  }
  return (
    <VerticalLayout label={label} deletable={deletable} onDelete={onDelete}>
      {children}
    </VerticalLayout>
  );
};

export const Row = ({
  children,
  css,
}: Pick<ComponentProps<typeof Flex>, "css" | "children">) => (
  <Flex css={{ px: theme.spacing[9], ...css }} direction="column">
    {children}
  </Flex>
);

export const $selectedInstanceScope = computed(
  [$selectedInstanceSelector, $variableValuesByInstanceSelector, $dataSources],
  (instanceSelector, variableValuesByInstanceSelector, dataSources) => {
    const scope: Record<string, unknown> = {};
    const aliases = new Map<string, string>();
    if (instanceSelector === undefined) {
      return { scope, aliases };
    }
    const values = variableValuesByInstanceSelector.get(
      JSON.stringify(instanceSelector)
    );
    if (values) {
      for (const [dataSourceId, value] of values) {
        const dataSource = dataSources.get(dataSourceId);
        if (dataSource === undefined) {
          continue;
        }
        const name = encodeDataSourceVariable(dataSourceId);
        scope[name] = value;
        aliases.set(name, dataSource.name);
      }
    }
    return { scope, aliases };
  }
);

export const updateExpressionValue = (expression: string, value: unknown) => {
  const dataSources = $dataSources.get();
  // when expression contains only reference to variable update that variable
  // extract id without parsing expression
  const potentialVariableId = decodeDataSourceVariable(expression);
  if (
    potentialVariableId !== undefined &&
    dataSources.has(potentialVariableId)
  ) {
    const dataSourceId = potentialVariableId;
    const dataSourceVariables = new Map($dataSourceVariables.get());
    dataSourceVariables.set(dataSourceId, value);
    $dataSourceVariables.set(dataSourceVariables);
  }
};

export const useBindingState = (expression: undefined | string) => {
  const $bindingState = useMemo((): ReadableAtom<{
    overwritable: boolean;
    variant: BindingVariant;
  }> => {
    if (expression === undefined) {
      // value is not bound to expression and can be updated
      return atom({ overwritable: true, variant: "default" });
    }
    // try to extract variable id from expression
    const potentialVariableId = decodeDataSourceVariable(expression);
    if (potentialVariableId === undefined) {
      // expression is complex and cannot be updated
      return atom({ overwritable: false, variant: "bound" });
    }
    return computed(
      [$dataSources, $dataSourceVariables],
      (dataSources, dataSourceVariables) => {
        const dataSource = dataSources.get(potentialVariableId);
        // resources and parameters cannot be updated
        if (dataSource?.type !== "variable") {
          return { overwritable: false, variant: "bound" };
        }
        const variableId = potentialVariableId;
        return {
          overwritable: true,
          variant:
            dataSourceVariables.get(variableId) === undefined
              ? "bound"
              : "overwritten",
        };
      }
    );
  }, [expression]);
  return useStore($bindingState);
};
