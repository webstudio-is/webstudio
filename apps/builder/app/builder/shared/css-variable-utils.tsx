import { useState, useEffect } from "react";
import { atom, computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Dialog,
  DialogActions,
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
import type { CustomProperty } from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import {
  $styles,
  $styleSourceSelections,
  $props,
} from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import {
  collectCssVariableReferences,
  createCssVariableNamesRegex,
  getDefinedCssVariableNames,
  getInstanceIdByStyleSourceId,
  performCssVariableRename,
  renameCssVariableMutable,
  updateVarReferencesInProps,
  validateCssVariableNameWithStyles,
} from "@webstudio-is/project-build/runtime/styles";
import { type CssVariableNameError } from "@webstudio-is/project-build/runtime/styles";

export { performCssVariableRename, updateVarReferencesInProps };

const $isDeleteUnusedCssVariablesDialogOpen = atom(false);

export const openDeleteUnusedCssVariablesDialog = () => {
  $isDeleteUnusedCssVariablesDialogOpen.set(true);
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

  const definedVariables = getDefinedCssVariableNames(styles.values());
  if (definedVariables.size === 0) {
    return { counts: usageCounts, instances: usageInstances };
  }
  const definedVariablesRegex = createCssVariableNamesRegex(definedVariables);

  const instancesByStyleSource = getInstanceIdByStyleSourceId(
    styleSourceSelections.values()
  );

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

    for (const varName of collectCssVariableReferences(
      toValue(styleDecl.value),
      definedVariablesRegex
    )) {
      addVarReference(varName, instanceId);
    }
  }

  // Track CSS variable references in HTML Embed code props
  for (const prop of props.values()) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      for (const varName of collectCssVariableReferences(
        prop.value,
        definedVariablesRegex
      )) {
        addVarReference(varName, prop.instanceId);
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
  return getDefinedCssVariableNames(styles.values()) as Set<CustomProperty>;
});

// Map CSS variables to the instances where they are defined
export const $cssVariableDefinitionsByVariable = computed(
  [$styleSourceSelections, $styles],
  (styleSourceSelections, styles) => {
    const definitionsByVariable = new Map<string, Set<Instance["id"]>>();

    const instancesByStyleSource = getInstanceIdByStyleSourceId(
      styleSourceSelections.values()
    );

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

    const definedVariables = getDefinedCssVariableNames(styles.values());
    if (definedVariables.size === 0) {
      return referencedVariables;
    }

    const definedVariablesRegex = createCssVariableNamesRegex(definedVariables);
    for (const styleDecl of styles.values()) {
      for (const varName of collectCssVariableReferences(
        toValue(styleDecl.value),
        definedVariablesRegex
      )) {
        referencedVariables.add(varName);
      }
    }
    for (const prop of props.values()) {
      if (prop.type === "string" && prop.name === "code" && prop.value) {
        for (const varName of collectCssVariableReferences(
          prop.value,
          definedVariablesRegex
        )) {
          referencedVariables.add(varName);
        }
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

export const validateCssVariableName = (
  name: string,
  currentProperty?: string
) =>
  validateCssVariableNameWithStyles({
    name,
    currentProperty,
    styles: $styles.get().values(),
  });

export const renameCssVariable = (
  oldProperty: string,
  newProperty: string
): CssVariableNameError | undefined => {
  const validationError = validateCssVariableName(newProperty, oldProperty);
  if (validationError) {
    return validationError;
  }

  serverSyncStore.createTransaction([$styles, $props], (styles, props) => {
    renameCssVariableMutable({
      styles,
      props,
      oldProperty,
      newProperty,
    });
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
        </Flex>
        <DialogActions>
          <Button
            autoFocus
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
        </DialogActions>
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
        </Flex>
        <DialogActions>
          <Button color="primary" onClick={handleConfirm}>
            Rename
          </Button>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
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
    <>
      <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
        {unusedVariablesArray.length === 0 ? (
          <Text>There are no unused CSS variables to delete.</Text>
        ) : (
          <>
            <Text>
              Delete {unusedVariablesArray.length} unused CSS{" "}
              {unusedVariablesArray.length === 1 ? "variable" : "variables"}{" "}
              from the project?
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
      </Flex>
      <DialogActions>
        {unusedVariablesArray.length > 0 && (
          <Button
            color="destructive"
            autoFocus
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
      </DialogActions>
    </>
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
