import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { Box, Select } from "@webstudio-is/design-system";
import {
  rootComponent,
  descendantComponent,
  collectionComponent,
  blockComponent,
  blockTemplateComponent,
} from "@webstudio-is/sdk";
import {
  $hoveredInstanceSelector,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/builder/shared/instance-label";

type TargetElement = {
  id: string;
  label: string;
  selector: string[];
};

/**
 * Components that should not be available as animation targets
 */
const excludedComponents = new Set([
  // Core system components
  rootComponent, // ws:root - HTML root
  descendantComponent, // ws:descendant - style-only
  collectionComponent, // ws:collection - data container
  blockComponent, // ws:block
  blockTemplateComponent, // ws:blockTemplate
  // Animation components (they contain animations, not targets)
  "@webstudio-is/sdk-components-animation:AnimateChildren",
  // Structural components that shouldn't be animated
  "Body",
]);

/**
 * Hook to find all elements that can be animated (for Custom Target dropdown)
 * Returns all instances with their selectors for hover highlighting
 */
const useAnimatableElements = (): TargetElement[] => {
  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);

  return useMemo(() => {
    const elements: TargetElement[] = [];

    // Build a map of parent relationships for selector construction
    const parentMap = new Map<string, string>();
    for (const [, instance] of instances) {
      for (const child of instance.children) {
        if (child.type === "id") {
          parentMap.set(child.value, instance.id);
        }
      }
    }

    // Build selector for an instance (array of ids from instance to root)
    const buildSelector = (instanceId: string): string[] => {
      const selector: string[] = [instanceId];
      let currentId = instanceId;
      while (parentMap.has(currentId)) {
        currentId = parentMap.get(currentId)!;
        selector.push(currentId);
      }
      return selector;
    };

    for (const [id, instance] of instances) {
      // Skip excluded components (system, animation, structural)
      if (excludedComponents.has(instance.component)) {
        continue;
      }

      // Skip the currently selected instance (can't target self via Custom)
      if (selectedInstanceSelector?.[0] === id) {
        continue;
      }

      const meta = metas.get(instance.component);
      const label = getInstanceLabel(instance, meta);

      elements.push({
        id,
        label,
        selector: buildSelector(id),
      });
    }

    return elements;
  }, [instances, metas, selectedInstanceSelector]);
};

type TargetSelectProps = {
  value: string | undefined;
  onChange: (target: string) => void;
};

/**
 * Target Select for Custom animation target
 * Shows all animatable elements with hover highlighting in canvas
 */
export const TargetSelect = ({ value, onChange }: TargetSelectProps) => {
  const elements = useAnimatableElements();

  return (
    <Box css={{ minWidth: 0 }}>
      <Select
        options={elements.map((el) => el.id)}
        getLabel={(id) => {
          const element = elements.find((el) => el.id === id);
          return element?.label ?? "Select";
        }}
        value={value}
        placeholder="Select element"
        onItemHighlight={(id) => {
          // Highlight the element in canvas on hover
          const element = elements.find((el) => el.id === id);
          $hoveredInstanceSelector.set(element?.selector);
        }}
        onChange={onChange}
      />
    </Box>
  );
};
