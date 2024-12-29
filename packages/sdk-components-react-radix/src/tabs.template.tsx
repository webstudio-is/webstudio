import {
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import {
  borderRadius,
  colors,
  fontSize,
  fontSizeLineHeight,
  height,
  weights,
  transition,
  opacity,
  boxShadow,
  spacing,
} from "./shared/theme";

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/tabs.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/

// inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all
// focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
// disabled:pointer-events-none disabled:opacity-50
// data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm

const tabsTriggerStyle = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: ${borderRadius.md};
  padding: ${spacing[1.5]} ${spacing[3]};
  font-size: ${fontSize.sm};
  line-height: ${fontSizeLineHeight.sm};
  font-weight: ${weights.medium};
  transition: ${transition.all};
  &:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: ${boxShadow.ring};
  }
  &:disabled {
    pointer-events: none;
    opacity: ${opacity[50]};
  }
  &[data-state="active"] {
    background-color: ${colors.background};
    color: ${colors.foreground};
    box-shadow: ${boxShadow.sm};
  }
`;

// mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
const tabsContentStyle = css`
  margin-top: ${spacing[2]};
  &:focus-visible {
    outline: none;
    box-shadow: ${boxShadow.ring};
  }
`;

export const meta: TemplateMeta = {
  category: "radix",
  description:
    "A set of panels with content that are displayed one at a time. Duplicate both a tab trigger and tab content to add more tabs. Triggers and content are connected according to their order in the Navigator.",
  order: 2,
  template: (
    <radix.Tabs defaultValue="0">
      <radix.TabsList
        // inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground
        ws:style={css`
          display: inline-flex;
          height: ${height[10]};
          align-items: center;
          justify-content: center;
          border-radius: ${borderRadius.md};
          background-color: ${colors.muted};
          padding: ${spacing[1]};
          color: ${colors.mutedForeground};
        `}
      >
        <radix.TabsTrigger ws:style={tabsTriggerStyle}>
          {new PlaceholderValue("Account")}
        </radix.TabsTrigger>
        <radix.TabsTrigger ws:style={tabsTriggerStyle}>
          {new PlaceholderValue("Password")}
        </radix.TabsTrigger>
      </radix.TabsList>
      <radix.TabsContent ws:style={tabsContentStyle}>
        {new PlaceholderValue("Make changes to your account here.")}
      </radix.TabsContent>
      <radix.TabsContent ws:style={tabsContentStyle}>
        {new PlaceholderValue("Change your password here.")}
      </radix.TabsContent>
    </radix.Tabs>
  ),
};
