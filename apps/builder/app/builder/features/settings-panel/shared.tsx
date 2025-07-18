import { atom, computed, type ReadableAtom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
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
  ariaAttributes,
  attributesByTag,
  elementsByTag,
} from "@webstudio-is/html-data";
import {
  reactPropsToStandardAttributes,
  showAttribute,
  standardAttributesToReactProps,
} from "@webstudio-is/react-sdk";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  SYSTEM_VARIABLE_ID,
  systemParameter,
} from "@webstudio-is/sdk";
import type { PropMeta, Prop, Asset } from "@webstudio-is/sdk";
import { InfoCircleIcon } from "@webstudio-is/icons";
import {
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
import {
  $dataSourceVariables,
  $dataSources,
  $registeredComponentMetas,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import type { BindingVariant } from "~/builder/shared/binding-popover";
import { humanizeString } from "~/shared/string-utils";
import {
  $selectedInstance,
  $selectedInstanceKeyWithRoot,
} from "~/shared/awareness";
import { $instanceTags } from "../style-panel/shared/model";

export const showAttributeMeta: PropMeta = {
  label: "Show",
  required: false,
  control: "boolean",
  type: "boolean",
  defaultValue: true,
  // If you are changing it, change the other one too
  description:
    "Removes the instance from the DOM. Breakpoints have no effect on this setting.",
};

export type PropValue =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "json"; value: unknown }
  | { type: "string[]"; value: string[] }
  | { type: "expression"; value: string }
  | { type: "asset"; value: Asset["id"] }
  | { type: "page"; value: Extract<Prop, { type: "page" }>["value"] }
  | { type: "action"; value: Extract<Prop, { type: "action" }>["value"] }
  | {
      type: "animationAction";
      value: Extract<Prop, { type: "animationAction" }>["value"];
    };

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
  onChange: (value: PropValue) => void;
};

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
    <Flex align="center" css={{ gap: theme.spacing[3], width: "100%" }}>
      <Box>{label}</Box>
      {readOnly && (
        <Tooltip
          content={
            "The value is controlled by an expression and cannot be changed."
          }
          variant="wrapped"
        >
          <InfoCircleIcon
            color={rawTheme.colors.foregroundSubtle}
            tabIndex={0}
          />
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
  children: ReactNode;
};

export const VerticalLayout = ({ label, children }: LayoutProps) => (
  <Box>
    <Grid
      css={{
        gridTemplateColumns: `1fr`,
        justifyItems: "start",
      }}
      align="center"
      gap="1"
      justify="between"
    >
      {label}
    </Grid>
    <Box css={{ py: theme.spacing[2] }}>{children}</Box>
  </Box>
);

export const HorizontalLayout = ({ label, children }: LayoutProps) => (
  <Grid
    css={{
      gridTemplateColumns: `${theme.spacing[19]} 1fr`,
      minHeight: theme.spacing[12],
    }}
    align="center"
    gap="2"
  >
    {label}
    {children}
  </Grid>
);

export const ResponsiveLayout = ({ label, children }: LayoutProps) => {
  return (
    <Flex
      align="center"
      wrap="wrap"
      css={{
        columnGap: theme.spacing[5],
        rowGap: theme.spacing[3],
        paddingBlock: theme.spacing[2],
      }}
    >
      <Box
        css={{
          // wrap label and input when label is more than ~9 characters
          flexBasis: `calc(30% - ${theme.spacing[5]} / 2)`,
          // allow content overflow flex basis
          minWidth: "auto",
        }}
      >
        {label}
      </Box>
      <Box
        css={{ flexBasis: `calc(70% - ${theme.spacing[5]} / 2)`, flexGrow: 1 }}
      >
        {children}
      </Box>
    </Flex>
  );
};

export const Row = ({
  children,
  css,
}: Pick<ComponentProps<typeof Flex>, "css" | "children">) => (
  <Flex
    css={{ paddingInline: theme.panel.paddingInline, ...css }}
    direction="column"
  >
    {children}
  </Flex>
);

export const $selectedInstanceScope = computed(
  [
    $selectedInstanceKeyWithRoot,
    $variableValuesByInstanceSelector,
    $dataSources,
  ],
  (instanceKey, variableValuesByInstanceSelector, dataSources) => {
    const scope: Record<string, unknown> = {};
    const aliases = new Map<string, string>();
    if (instanceKey === undefined) {
      return { scope, aliases };
    }
    const values = variableValuesByInstanceSelector.get(instanceKey);
    if (values) {
      for (const [dataSourceId, value] of values) {
        let dataSource = dataSources.get(dataSourceId);
        if (dataSourceId === SYSTEM_VARIABLE_ID) {
          dataSource = systemParameter;
        }
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

type BindingState = {
  overwritable: boolean;
  variant: BindingVariant;
};

export const useBindingState = (expression: undefined | string) => {
  const $bindingState = useMemo((): ReadableAtom<BindingState> => {
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
      (dataSources, dataSourceVariables): BindingState => {
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

export const humanizeAttribute = (string: string) => {
  if (string.includes("-")) {
    return string;
  }
  if (string === "class" || string === "className") {
    return "Class";
  }
  if (string === "for" || string === "htmlFor") {
    return "For";
  }
  return humanizeString(standardAttributesToReactProps[string] ?? string);
};

type Attribute = (typeof ariaAttributes)[number];

const attributeToMeta = (attribute: Attribute): PropMeta => {
  const required = attribute.required ?? false;
  const description = attribute.description;
  if (attribute.type === "select") {
    const options = attribute.options ?? [];
    return {
      type: "string",
      control: options.length > 3 ? "select" : "radio",
      required,
      options,
      description,
    };
  }
  if (attribute.type === "url") {
    return { type: "string", control: "url", required, description };
  }
  if (attribute.type === "string") {
    return { type: "string", control: "text", required, description };
  }
  if (attribute.type === "number") {
    return { type: "number", control: "number", required, description };
  }
  if (attribute.type === "boolean") {
    return { type: "boolean", control: "boolean", required, description };
  }
  attribute.type satisfies never;
  throw Error("impossible case");
};

export const $selectedInstancePropsMetas = computed(
  [$selectedInstance, $registeredComponentMetas, $instanceTags],
  (instance, metas, instanceTags): Map<string, PropMeta> => {
    if (instance === undefined) {
      return new Map();
    }
    const meta = metas.get(instance.component);
    const tag = instanceTags.get(instance.id);
    const propsMetas = new Map<Prop["name"], PropMeta>();
    // add html attributes only when instance has tag
    if (tag) {
      if (elementsByTag[tag].categories.includes("html-element")) {
        for (const attribute of [...ariaAttributes].reverse()) {
          propsMetas.set(attribute.name, attributeToMeta(attribute));
        }
        // include global attributes only for html elements
        if (attributesByTag["*"]) {
          for (const attribute of [...attributesByTag["*"]].reverse()) {
            propsMetas.set(attribute.name, attributeToMeta(attribute));
          }
        }
      }
      if (attributesByTag[tag]) {
        for (const attribute of [...attributesByTag[tag]].reverse()) {
          propsMetas.set(attribute.name, attributeToMeta(attribute));
        }
      }
    }
    for (const [name, propMeta] of Object.entries(
      meta?.props ?? {}
    ).reverse()) {
      // when component property has the same name as html attribute in react
      // override to deduplicate similar properties
      // for example component can have own "className" and html has "class"
      const htmlName = reactPropsToStandardAttributes[name];
      if (htmlName) {
        propsMetas.delete(htmlName);
      }
      propsMetas.set(name, propMeta);
    }
    propsMetas.set(showAttribute, showAttributeMeta);
    // ui should render in the following order
    // 1. system properties
    // 2. component properties
    // 3. specific tag attributes
    // 4. global html attributes
    // 5. aria attributes
    return new Map(Array.from(propsMetas.entries()).reverse());
  }
);

export const $selectedInstanceInitialPropNames = computed(
  [$selectedInstance, $registeredComponentMetas, $selectedInstancePropsMetas],
  (selectedInstance, metas, instancePropsMetas) => {
    const initialPropNames = new Set<string>();
    if (selectedInstance) {
      const initialProps =
        metas.get(selectedInstance.component)?.initialProps ?? [];
      for (const propName of initialProps) {
        // className -> class
        if (instancePropsMetas.has(reactPropsToStandardAttributes[propName])) {
          initialPropNames.add(reactPropsToStandardAttributes[propName]);
        } else {
          initialPropNames.add(propName);
        }
      }
    }
    for (const [propName, propMeta] of instancePropsMetas) {
      // skip show attribute which is added as system prop
      if (propName === showAttribute) {
        continue;
      }
      if (propMeta.required) {
        initialPropNames.add(propName);
      }
    }
    return initialPropNames;
  }
);
