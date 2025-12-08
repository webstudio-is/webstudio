import { useState, useEffect } from "react";
import { atom, computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  Button,
  Text,
  Flex,
  theme,
  InputField,
  toast,
} from "@webstudio-is/design-system";
import type {
  Instance,
  StyleDecl,
  StyleSourceSelections,
  Props,
} from "@webstudio-is/sdk";
import type {
  StyleValue,
  StyleProperty,
  CssProperty,
} from "@webstudio-is/css-engine";
import { $styles, $styleSourceSelections, $props } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import { createBatchUpdate } from "~/builder/features/style-panel/shared/use-style-data";

const $isDeleteUnusedCssVariablesDialogOpen = atom(false);

export const openDeleteUnusedCssVariablesDialog = () => {
  $isDeleteUnusedCssVariablesDialogOpen.set(true);
};

// Traverse a StyleValue to find all var() references
const findVarReferences = (
  value: StyleValue,
  callback: (varName: string) => void
) => {
  if (value.type === "var") {
    callback(`--${value.value}`);
  }

  // Recursively traverse all properties that might contain StyleValue
  for (const key in value) {
    const prop = value[key as keyof typeof value];
    if (prop == null) {
      continue;
    }
    // Handle nested StyleValue
    if (typeof prop === "object" && "type" in prop) {
      findVarReferences(prop as StyleValue, callback);
    }
    // Handle arrays of StyleValue (tuple, layers)
    else if (Array.isArray(prop)) {
      for (const item of prop) {
        if (typeof item === "object" && item !== null && "type" in item) {
          findVarReferences(item as StyleValue, callback);
        }
      }
    }
  }
};

// Find var() references in HTML/CSS strings (for HTML Embed code prop)
const findVarReferencesInString = (
  code: string,
  callback: (varName: string) => void
) => {
  // Match var(--name) or var(--name, fallback) patterns
  const matches = code.matchAll(/var\(\s*(--[\w-]+)/g);
  for (const match of matches) {
    callback(match[1]);
  }
};

// Find all CSS variable references in HTML Embed code props
const findVarReferencesInProps = (
  props: Props,
  callback: (varName: string) => void
) => {
  for (const prop of props.values()) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      findVarReferencesInString(prop.value, callback);
    }
  }
};

// Find CSS variable usage counts (how many times each variable is referenced via var())
export const findCssVariableUsagesByInstance = ({
  styleSourceSelections,
  styles,
  props,
}: {
  styleSourceSelections: StyleSourceSelections;
  styles: Map<string, StyleDecl>;
  props: Props;
}): {
  counts: Map<string, number>;
  instances: Map<string, Set<Instance["id"]>>;
} => {
  const usageCounts = new Map<string, number>();
  const usageInstances = new Map<string, Set<Instance["id"]>>();

  // Track which style sources belong to which instances
  const instancesByStyleSource = new Map<string, Instance["id"]>();
  for (const { instanceId, values } of styleSourceSelections.values()) {
    for (const styleSourceId of values) {
      instancesByStyleSource.set(styleSourceId, instanceId);
    }
  }

  // Helper to add a var reference
  const addVarReference = (varName: string, instanceId: Instance["id"]) => {
    const count = usageCounts.get(varName) ?? 0;
    usageCounts.set(varName, count + 1);

    let instances = usageInstances.get(varName);
    if (instances === undefined) {
      instances = new Set();
      usageInstances.set(varName, instances);
    }
    instances.add(instanceId);
  };

  // Track CSS variable references in StyleDecl values
  for (const styleDecl of styles.values()) {
    const instanceId = instancesByStyleSource.get(styleDecl.styleSourceId);
    if (!instanceId) {
      continue;
    }

    // Track CSS variable references (var(--name) in values)
    // Note: We don't track definitions here, only actual usages
    // Each reference counts as a usage, even if on the same instance
    findVarReferences(styleDecl.value, (varName) => {
      addVarReference(varName, instanceId);
    });
  }

  // Track CSS variable references in HTML Embed code props
  for (const prop of props.values()) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      findVarReferencesInString(prop.value, (varName) => {
        addVarReference(varName, prop.instanceId);
      });
    }
  }

  return { counts: usageCounts, instances: usageInstances };
};

const $cssVariableUsageData = computed(
  [$styleSourceSelections, $styles, $props],
  (styleSourceSelections, styles, props) => {
    return findCssVariableUsagesByInstance({
      styleSourceSelections,
      styles,
      props,
    });
  }
);

export const $usedCssVariablesInInstances = computed(
  $cssVariableUsageData,
  (data) => data.counts
);

export const $cssVariableInstancesByVariable = computed(
  $cssVariableUsageData,
  (data) => data.instances
);

// Get all defined CSS variables (unique properties that start with --)
export const $definedCssVariables = computed($styles, (styles) => {
  const definedVariables = new Set<string>();
  for (const styleDecl of styles.values()) {
    if (styleDecl.property.startsWith("--")) {
      definedVariables.add(styleDecl.property);
    }
  }
  return definedVariables;
});

// Map CSS variables to the instances where they are defined
export const $cssVariableDefinitionsByVariable = computed(
  [$styleSourceSelections, $styles],
  (styleSourceSelections, styles) => {
    const definitionsByVariable = new Map<string, Set<Instance["id"]>>();

    // Build map of styleSourceId to instanceId
    const instancesByStyleSource = new Map<string, Instance["id"]>();
    for (const { instanceId, values } of styleSourceSelections.values()) {
      for (const styleSourceId of values) {
        instancesByStyleSource.set(styleSourceId, instanceId);
      }
    }

    // Find all CSS variable definitions
    for (const styleDecl of styles.values()) {
      if (styleDecl.property.startsWith("--")) {
        const instanceId = instancesByStyleSource.get(styleDecl.styleSourceId);
        if (instanceId) {
          let instances = definitionsByVariable.get(styleDecl.property);
          if (instances === undefined) {
            instances = new Set();
            definitionsByVariable.set(styleDecl.property, instances);
          }
          instances.add(instanceId);
        }
      }
    }

    return definitionsByVariable;
  }
);

// Get all referenced CSS variables (from both styles and HTML Embed code props)
export const $referencedCssVariables = computed(
  [$styles, $props],
  (styles, props) => {
    const referencedVariables = new Set<string>();
    for (const styleDecl of styles.values()) {
      findVarReferences(styleDecl.value, (varName) => {
        referencedVariables.add(varName);
      });
    }
    findVarReferencesInProps(props, (varName) => {
      referencedVariables.add(varName);
    });
    return referencedVariables;
  }
);

export type CssVariableError =
  | { type: "required"; message: string }
  | { type: "invalid"; message: string }
  | { type: "duplicate"; message: string };

export const validateCssVariableName = (
  name: string,
  currentProperty?: string
): CssVariableError | undefined => {
  // Check if name is required
  if (name.trim().length === 0) {
    return {
      type: "required",
      message: "CSS variable name cannot be empty",
    };
  }

  // Ensure name starts with --
  if (!name.startsWith("--")) {
    return {
      type: "invalid",
      message: 'CSS variable name must start with "--"',
    };
  }

  // Check for duplicates within the same style source + breakpoint + state
  const styles = $styles.get();
  for (const styleDecl of styles.values()) {
    if (
      styleDecl.property === name &&
      styleDecl.property !== currentProperty &&
      styleDecl.property.startsWith("--")
    ) {
      return {
        type: "duplicate",
        message: `CSS variable "${name}" already exists`,
      };
    }
  }
};

// Update all var() references in a StyleValue
const updateVarReferences = (
  value: StyleValue,
  oldProperty: string,
  newProperty: string
): StyleValue => {
  if (value.type === "var") {
    const currentVarName = `--${value.value}`;
    if (currentVarName === oldProperty) {
      value = {
        ...value,
        value: newProperty.slice(2), // Remove -- prefix
      };
    }
  }

  // Recursively update all properties that might contain StyleValue
  const result = { ...value } as Record<string, unknown>;
  for (const key in value) {
    const prop = value[key as keyof typeof value];
    if (prop == null || key === "type") {
      continue;
    }
    // Handle nested StyleValue
    if (typeof prop === "object" && "type" in prop) {
      result[key] = updateVarReferences(
        prop as StyleValue,
        oldProperty,
        newProperty
      );
    }
    // Handle arrays of StyleValue (tuple, layers)
    else if (Array.isArray(prop)) {
      result[key] = prop.map((item) => {
        if (typeof item === "object" && item !== null && "type" in item) {
          return updateVarReferences(
            item as StyleValue,
            oldProperty,
            newProperty
          );
        }
        return item;
      });
    }
  }
  return result as StyleValue;
};

// Core rename logic without transaction wrapper (for testing)
export const performCssVariableRename = (
  styles: Map<string, StyleDecl>,
  oldProperty: string,
  newProperty: string
): Map<string, StyleDecl> => {
  const updatedStyles = new Map(styles);

  // Update all StyleDecl with the old property name
  const styleDeclsToUpdate: Array<{ key: string; decl: StyleDecl }> = [];
  for (const [key, styleDecl] of updatedStyles) {
    if (styleDecl.property === oldProperty) {
      styleDeclsToUpdate.push({ key, decl: styleDecl });
    }
  }

  for (const { key, decl } of styleDeclsToUpdate) {
    updatedStyles.delete(key);
    const newDecl = { ...decl, property: newProperty as StyleProperty };
    updatedStyles.set(getStyleDeclKey(newDecl), newDecl);
  }

  // Update all var() references in StyleValue
  const styleDeclsToUpdateRefs: Array<{ key: string; decl: StyleDecl }> = [];
  for (const [key, styleDecl] of updatedStyles) {
    styleDeclsToUpdateRefs.push({ key, decl: styleDecl });
  }

  for (const { key, decl } of styleDeclsToUpdateRefs) {
    const newValue = updateVarReferences(decl.value, oldProperty, newProperty);
    if (newValue !== decl.value) {
      updatedStyles.set(key, { ...decl, value: newValue });
    }
  }

  return updatedStyles;
};

// Update var() references in HTML Embed code props (pure function for testing)
export const updateVarReferencesInProps = (
  props: Props,
  oldProperty: string,
  newProperty: string
): Props => {
  const updatedProps = new Map(props);
  // Match var( followed by optional whitespace, the old property name, and then either:
  // - closing paren )
  // - comma (for fallback values)
  // - whitespace
  const regex = new RegExp(
    `var\\(\\s*${oldProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s,)])`,
    "g"
  );

  for (const [key, prop] of updatedProps) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      const updatedValue = prop.value.replace(regex, `var(${newProperty}`);
      if (updatedValue !== prop.value) {
        updatedProps.set(key, { ...prop, value: updatedValue });
      }
    }
  }

  return updatedProps;
};

export const renameCssVariable = (
  oldProperty: string,
  newProperty: string
): CssVariableError | undefined => {
  const validationError = validateCssVariableName(newProperty, oldProperty);
  if (validationError) {
    return validationError;
  }

  serverSyncStore.createTransaction([$styles, $props], (styles, props) => {
    const updatedStyles = performCssVariableRename(
      styles,
      oldProperty,
      newProperty
    );

    // Clear and repopulate the styles map
    styles.clear();
    for (const [key, value] of updatedStyles) {
      styles.set(key, value);
    }

    // Update var() references in HTML Embed code props
    const updatedProps = updateVarReferencesInProps(
      props,
      oldProperty,
      newProperty
    );
    props.clear();
    for (const [key, value] of updatedProps) {
      props.set(key, value);
    }
  });

  return undefined;
};

export const deleteUnusedCssVariables = () => {
  const definedVariables = $definedCssVariables.get();
  const referencedVariables = $referencedCssVariables.get();

  // Find unused variables (defined but not referenced)
  const unusedVariables: string[] = [];
  for (const varName of definedVariables) {
    if (!referencedVariables.has(varName)) {
      unusedVariables.push(varName);
    }
  }

  if (unusedVariables.length === 0) {
    return 0;
  }

  const batch = createBatchUpdate();
  for (const varName of unusedVariables) {
    batch.deleteProperty(varName as CssProperty);
  }
  batch.publish();

  return unusedVariables.length;
};

type DeleteCssVariableDialogProps = {
  cssVariable?: { property: string };
  onClose: () => void;
  onConfirm: (property: string) => void;
};

export const DeleteCssVariableDialog = ({
  cssVariable,
  onClose,
  onConfirm,
}: DeleteCssVariableDialogProps) => {
  return (
    <Dialog
      open={cssVariable !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          // Prevent command panel from handling keyboard events
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete confirmation</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>{`Delete CSS variable "${cssVariable?.property}" from the project?`}</Text>
          <Flex direction="rowReverse" gap="2">
            <Button
              color="destructive"
              onClick={() => {
                onConfirm(cssVariable!.property);
                onClose();
              }}
            >
              Delete
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};

type RenameCssVariableDialogProps = {
  cssVariable?: { property: string };
  onClose: () => void;
  onConfirm: (oldProperty: string, newProperty: string) => void;
};

export const RenameCssVariableDialog = ({
  cssVariable,
  onClose,
  onConfirm,
}: RenameCssVariableDialogProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  // Reset name and clear error when cssVariable changes
  useEffect(() => {
    if (cssVariable?.property !== undefined) {
      setName(cssVariable.property);
      setError(undefined);
    }
  }, [cssVariable?.property]);

  const handleConfirm = () => {
    const renameError = renameCssVariable(cssVariable!.property, name);
    if (renameError) {
      setError(renameError.message);
      return;
    }
    onConfirm(cssVariable!.property, name);
    onClose();
  };

  return (
    <Dialog
      open={cssVariable !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          // Prevent command panel from handling keyboard events
          event.stopPropagation();
          if (event.key === "Enter" && !error) {
            handleConfirm();
          }
        }}
      >
        <DialogTitle>Rename CSS Variable</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Flex direction="column" gap="1">
            <InputField
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
              color={error ? "error" : undefined}
            />
            {error && (
              <Text color="destructive" variant="monoBold">
                {error}
              </Text>
            )}
          </Flex>
          <Flex direction="rowReverse" gap="2">
            <Button color="primary" onClick={handleConfirm}>
              Rename
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteUnusedCssVariablesDialog = () => {
  const open = useStore($isDeleteUnusedCssVariablesDialogOpen);
  const definedVariables = useStore($definedCssVariables);
  const referencedVariables = useStore($referencedCssVariables);

  const handleClose = () => {
    $isDeleteUnusedCssVariablesDialogOpen.set(false);
  };

  // Find unused variables (defined but not referenced)
  const unusedVariables: string[] = [];
  for (const varName of definedVariables) {
    if (!referencedVariables.has(varName)) {
      unusedVariables.push(varName);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          handleClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete unused CSS variables</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          {unusedVariables.length === 0 ? (
            <Text>There are no unused CSS variables to delete.</Text>
          ) : (
            <>
              <Text>
                Delete {unusedVariables.length} unused CSS{" "}
                {unusedVariables.length === 1 ? "variable" : "variables"} from
                the project?
              </Text>
              <Text
                variant="mono"
                css={{
                  maxHeight: 200,
                  overflowY: "auto",
                  backgroundColor: theme.colors.backgroundPanel,
                  borderRadius: theme.borderRadius[4],
                  wordBreak: "break-word",
                }}
              >
                {unusedVariables.join(", ")}
              </Text>
            </>
          )}
          <Flex direction="rowReverse" gap="2">
            {unusedVariables.length > 0 && (
              <Button
                color="destructive"
                onClick={() => {
                  const deletedCount = deleteUnusedCssVariables();
                  handleClose();
                  if (deletedCount === 0) {
                    toast.info("No unused CSS variables to delete");
                  } else {
                    toast.success(
                      `Deleted ${deletedCount} unused CSS ${deletedCount === 1 ? "variable" : "variables"}`
                    );
                  }
                }}
              >
                Delete
              </Button>
            )}
            <DialogClose>
              <Button color="ghost">
                {unusedVariables.length > 0 ? "Cancel" : "Close"}
              </Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};
