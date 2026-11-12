import { useState, type ComponentProps } from "react";
import { Box, cssVar, theme } from "@webstudio-is/design-system";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { MixedStyleBlockEditor } from "./mixed-style-block-editor";

const cascadedValue = { type: "keyword", value: "blue" } as const;
const presetValue = { type: "keyword", value: "block" } as const;
const globalValue = { type: "keyword", value: "red" } as const;
const localDeclarations: ComponentProps<
  typeof MixedStyleBlockEditor
>["declarations"] = [
  { property: "opacity", value: { type: "unit", unit: "number", value: 0.8 } },
];
const inheritedDeclarations: ComputedStyleDecl[] = [
  {
    property: "color",
    source: { name: "remote" },
    cascadedValue,
    computedValue: cascadedValue,
    usedValue: cascadedValue,
  },
  {
    property: "display",
    source: { name: "preset" },
    cascadedValue: presetValue,
    computedValue: presetValue,
    usedValue: presetValue,
  },
  {
    property: "--brand-color",
    source: { name: "remote", instanceId: ROOT_INSTANCE_ID },
    cascadedValue: globalValue,
    computedValue: globalValue,
    usedValue: globalValue,
  },
];

export default {
  title: "Builder/Style panel/Advanced code editor",
};

export const InlineCode = () => (
  <Box
    css={{
      width: theme.sizes.sidebarWidth,
      background: cssVar("--background-primary"),
    }}
  >
    <MixedStyleBlockEditor
      inline
      declarations={localDeclarations}
      sourceDeclarations={inheritedDeclarations}
      readonly={false}
      onApply={() => {}}
    />
  </Box>
);

export const CenteredCode = () => (
  <MixedStyleBlockEditor
    declarations={localDeclarations}
    sourceDeclarations={inheritedDeclarations}
    readonly={false}
    open
    onOpenChange={() => {}}
    onApply={() => {}}
  />
);

export const EditableCode = () => {
  const [declarations, setDeclarations] = useState<
    ComponentProps<typeof MixedStyleBlockEditor>["declarations"]
  >([]);
  return (
    <MixedStyleBlockEditor
      inline
      declarations={declarations}
      sourceDeclarations={inheritedDeclarations}
      readonly={false}
      onApply={({ oldStyles, newStyles, canDelete }) => {
        const styles = new Map(oldStyles);
        if (canDelete) {
          for (const property of oldStyles.keys()) {
            if (!newStyles.has(property)) {
              styles.delete(property);
            }
          }
        }
        for (const [property, value] of newStyles) {
          styles.set(property, value);
        }
        setDeclarations(
          Array.from(styles, ([property, value]) => ({ property, value }))
        );
        return styles;
      }}
    />
  );
};
