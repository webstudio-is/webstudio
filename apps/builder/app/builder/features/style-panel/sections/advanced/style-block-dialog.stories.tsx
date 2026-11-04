import { Box, cssVar, theme } from "@webstudio-is/design-system";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { InlineMixedStyleBlockEditor } from "./style-block-dialog";

const cascadedValue = { type: "keyword", value: "blue" } as const;
const presetValue = { type: "keyword", value: "block" } as const;
const globalValue = { type: "keyword", value: "red" } as const;
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
  title: "Builder/Style panel/Advanced inline code",
};

export const InlineCode = () => (
  <Box
    css={{
      width: theme.sizes.sidebarWidth,
      background: cssVar("--background-primary"),
    }}
  >
    <InlineMixedStyleBlockEditor
      declarations={[
        {
          property: "opacity",
          value: { type: "unit", unit: "number", value: 0.8 },
        },
      ]}
      sourceDeclarations={inheritedDeclarations}
      readonly={false}
      onApply={() => {}}
    />
  </Box>
);
