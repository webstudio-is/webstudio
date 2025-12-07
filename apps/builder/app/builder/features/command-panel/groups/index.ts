import { computed } from "nanostores";
import {
  $componentOptions,
  ComponentGroup,
  type ComponentOption,
} from "./component-group";
import { $tagOptions, TagGroup, type TagOption } from "./tag-group";
import {
  $breakpointOptions,
  BreakpointGroup,
  type BreakpointOption,
} from "./breakpoint-group";
import { $pageOptions, PageGroup, type PageOption } from "./page-group";
import {
  $shortcutOptions,
  ShortcutGroup,
  type ShortcutOption,
} from "./shortcut-group";
import { $tokenOptions, TokenGroup, type TokenOption } from "./token-group";

export type Option =
  | ComponentOption
  | TagOption
  | BreakpointOption
  | PageOption
  | ShortcutOption
  | TokenOption;

export const $allOptions = computed(
  [
    $componentOptions,
    $tagOptions,
    $breakpointOptions,
    $pageOptions,
    $shortcutOptions,
    $tokenOptions,
  ],
  (
    componentOptions,
    tagOptions,
    breakpointOptions,
    pageOptions,
    shortcutOptions,
    tokenOptions
  ) => [
    ...componentOptions,
    ...tagOptions,
    ...breakpointOptions,
    ...pageOptions,
    ...shortcutOptions,
    ...tokenOptions,
  ]
);

export const groups = {
  component: ComponentGroup,
  tag: TagGroup,
  breakpoint: BreakpointGroup,
  page: PageGroup,
  shortcut: ShortcutGroup,
  token: TokenGroup,
} as const;

export type {
  ComponentOption,
  TagOption,
  BreakpointOption,
  PageOption,
  ShortcutOption,
  TokenOption,
};

export {
  ComponentGroup,
  TagGroup,
  BreakpointGroup,
  PageGroup,
  ShortcutGroup,
  TokenGroup,
};
