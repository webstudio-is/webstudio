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
  CustomProperty,
} from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import {
  $styles,
  $styleSourceSelections,
  $props,
} from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { getStyleDeclKey } from "@webstudio-is/sdk";

const $isDeleteUnusedCssVariablesDialogOpen = atom(false);

export const openDeleteUnusedCssVariablesDialog = () => {
  $isDeleteUnusedCssVariablesDialogOpen.set(true);
};

// Utility: Escape regex special characters
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Utility: Create regex to match variable name with word boundary
// This avoids matching --color inside --color-dark
// Uses negative lookahead (?![\\w-]) to ensure variable name doesn't continue
// with word characters or hyphens, preventing partial matches.
const createVarNameRegex = (varName: string): RegExp => {
  return new RegExp(`${escapeRegex(varName)}(?![\\w-])`, "g");
};

// Traverse a StyleValue to find all var() references
const findVarReferences = (value: StyleValue, varName: string): boolean => {
  const valueStr = toValue(value);
  return createVarNameRegex(varName).test(valueStr);
};

// Find all CSS variable references in HTML Embed code props
const findVarReferencesInProps = (props: Props, varName: string): boolean => {
  const regex = createVarNameRegex(varName);
  for (const prop of props.values()) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      if (regex.test(prop.value)) {
        return true;
      }
    }
  }
  return false;
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

  // Collect all defined variables
  // Performance optimization: Only check variables that are defined
  // instead of searching for all possible var() patterns.
  // This is O(defined_vars × styles) instead of O(all_patterns × styles).
  const definedVariables = new Set<string>();
  for (const styleDecl of styles.values()) {
    if (styleDecl.property.startsWith("--")) {
      definedVariables.add(styleDecl.property);
    }
  }

  // Track CSS variable references in StyleDecl values
  for (const styleDecl of styles.values()) {
    const instanceId = instancesByStyleSource.get(styleDecl.styleSourceId);
    if (!instanceId) {
      continue;
    }

    // Check each defined variable if it's used in this style
    for (const varName of definedVariables) {
      if (findVarReferences(styleDecl.value, varName)) {
        addVarReference(varName, instanceId);
      }
    }
  }

  // Track CSS variable references in HTML Embed code props
  for (const varName of definedVariables) {
    if (findVarReferencesInProps(props, varName)) {
      // Find which instance this belongs to
      for (const prop of props.values()) {
        if (prop.type === "string" && prop.name === "code" && prop.value) {
          const regex = createVarNameRegex(varName);
          if (regex.test(prop.value)) {
            addVarReference(varName, prop.instanceId);
          }
        }
      }
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
  const definedVariables = new Set<CustomProperty>();
  for (const styleDecl of styles.values()) {
    if (styleDecl.property.startsWith("--")) {
      definedVariables.add(styleDecl.property as CustomProperty);
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

    // Collect all defined variables first
    const definedVariables = new Set<string>();
    for (const styleDecl of styles.values()) {
      if (styleDecl.property.startsWith("--")) {
        definedVariables.add(styleDecl.property);
      }
    }

    // Check which defined variables are referenced
    for (const varName of definedVariables) {
      // Check in styles
      // Performance optimization: We only need to know IF a variable is used (boolean),
      // not HOW MANY times, so we break on first match.
      for (const styleDecl of styles.values()) {
        if (findVarReferences(styleDecl.value, varName)) {
          referencedVariables.add(varName);
          break;
        }
      }

      // Check in props if not already found
      if (
        !referencedVariables.has(varName) &&
        findVarReferencesInProps(props, varName)
      ) {
        referencedVariables.add(varName);
      }
    }

    return referencedVariables;
  }
);

// Get all unused CSS variables (defined in instances but not referenced)
export const $unusedCssVariables = computed(
  [$cssVariableDefinitionsByVariable, $referencedCssVariables],
  (definitionsByVariable, referencedVariables) => {
    const unusedVariables = new Set<string>();
    for (const varName of definitionsByVariable.keys()) {
      if (!referencedVariables.has(varName)) {
        unusedVariables.add(varName);
      }
    }
    return unusedVariables;
  }
);

type CssVariableError =
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
  // For simple replacement, use JSON stringify/parse approach
  // since toValue produces CSS string which is harder to parse back
  let valueStr = JSON.stringify(value);

  // Handle two patterns:
  // 1. In var type objects: "value":"variable-name" (without --)
  //    StyleValue stores var without -- prefix in "value" field
  // 2. In literal strings: "--variable-name" (with --)
  //    Unparsed strings contain full --variable-name syntax
  // Both patterns are needed because StyleValue can contain both structured
  // var types and unparsed CSS strings with var() references

  // Strip -- prefix for var type replacement
  const oldVarName = oldProperty.startsWith("--")
    ? oldProperty.slice(2)
    : oldProperty;
  const newVarName = newProperty.startsWith("--")
    ? newProperty.slice(2)
    : newProperty;

  // Replace in var type value fields: "value":"old-name" -> "value":"new-name"
  // Use word boundary to avoid replacing "color" in "color-dark"
  const varTypeRegex = new RegExp(
    `("value":")${escapeRegex(oldVarName)}(?![\\w-])`,
    "g"
  );
  valueStr = valueStr.replace(varTypeRegex, `$1${newVarName}`);

  // Also replace literal --variable-name in unparsed strings
  valueStr = valueStr.replace(createVarNameRegex(oldProperty), newProperty);

  return JSON.parse(valueStr) as StyleValue;
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
  const regex = createVarNameRegex(oldProperty);

  for (const [key, prop] of updatedProps) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      const updatedValue = prop.value.replace(regex, newProperty);
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

  return;
};

export const deleteUnusedCssVariables = () => {
  const unusedVariables = $unusedCssVariables.get();

  if (unusedVariables.size === 0) {
    return 0;
  }

  // Delete all unused variable declarations
  serverSyncStore.createTransaction([$styles], (styles) => {
    const keysToDelete: string[] = [];

    for (const [key, styleDecl] of styles) {
      if (unusedVariables.has(styleDecl.property)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      styles.delete(key);
    }
  });

  return unusedVariables.size;
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

const DeleteUnusedCssVariablesDialogContent = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const unusedVariables = useStore($unusedCssVariables);
  // Convert Set to Array for display
  const unusedVariablesArray = Array.from(unusedVariables);

  return (
    <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
      {unusedVariablesArray.length === 0 ? (
        <Text>There are no unused CSS variables to delete.</Text>
      ) : (
        <>
          <Text>
            Delete {unusedVariablesArray.length} unused CSS{" "}
            {unusedVariablesArray.length === 1 ? "variable" : "variables"} from
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
            {unusedVariablesArray.join(", ")}
          </Text>
        </>
      )}
      <Flex direction="rowReverse" gap="2">
        {unusedVariablesArray.length > 0 && (
          <Button
            color="destructive"
            onClick={() => {
              const deletedCount = deleteUnusedCssVariables();
              onClose();
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
            {unusedVariablesArray.length > 0 ? "Cancel" : "Close"}
          </Button>
        </DialogClose>
      </Flex>
    </Flex>
  );
};

export const DeleteUnusedCssVariablesDialog = () => {
  const open = useStore($isDeleteUnusedCssVariablesDialogOpen);
  const handleClose = () => {
    $isDeleteUnusedCssVariablesDialogOpen.set(false);
  };

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
        width={400}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete unused CSS variables</DialogTitle>
        <DeleteUnusedCssVariablesDialogContent onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
};
