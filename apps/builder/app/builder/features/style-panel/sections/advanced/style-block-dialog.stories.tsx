import { Box, Label, cssVar, theme } from "@webstudio-is/design-system";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { InheritedStylesPreview } from "./inherited-styles-preview";
import { InlineStyleBlockEditor } from "./style-block-dialog";

const cascadedValue = { type: "keyword", value: "blue" } as const;
const presetValue = { type: "keyword", value: "block" } as const;
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
];

export default {
  title: "Builder/Style panel/Advanced inline code",
};

export const InlineCode = () => (
  <Box
    css={{
      width: theme.sizes.sidebarWidth,
      background: cssVar("--background-primary"),
    }}
  >
    <Box
      css={{
        paddingInline: theme.panel.paddingInline,
        paddingTop: theme.spacing[2],
      }}
    >
      <Label>Local styles</Label>
    </Box>
    <InlineStyleBlockEditor
      declarations={[
        { property: "color", value: { type: "keyword", value: "red" } },
      ]}
      readonly={false}
      onApply={() => {}}
    />
    <InheritedStylesPreview
      declarations={inheritedDeclarations}
      showCascaded
      showPreset
    />
  </Box>
);
