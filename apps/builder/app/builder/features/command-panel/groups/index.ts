import { computed } from "nanostores";
import {
  $componentOptions,
  ComponentsGroup,
  type ComponentOption,
} from "./components-group";
import { $tagOptions, TagsGroup, type TagOption } from "./tags-group";
import {
  $breakpointOptions,
  BreakpointsGroup,
  type BreakpointOption,
} from "./breakpoints-group";
import { $pageOptions, PagesGroup, type PageOption } from "./pages-group";
import {
  $commandOptions,
  CommandsGroup,
  type CommandOption,
} from "./commands-group";
import { $tokenOptions, TokensGroup, type TokenOption } from "./tokens-group";

export type Option =
  | ComponentOption
  | TagOption
  | BreakpointOption
  | PageOption
  | CommandOption
  | TokenOption;

export const $allOptions = computed(
  [
    $componentOptions,
    $tagOptions,
    $breakpointOptions,
    $pageOptions,
    $commandOptions,
    $tokenOptions,
  ],
  (
    componentOptions,
    tagOptions,
    breakpointOptions,
    pageOptions,
    commandOptions,
    tokenOptions
  ) => [
    ...componentOptions,
    ...tagOptions,
    ...breakpointOptions,
    ...pageOptions,
    ...commandOptions,
    ...tokenOptions,
  ]
);

export const groups = {
  component: ComponentsGroup,
  tag: TagsGroup,
  breakpoint: BreakpointsGroup,
  page: PagesGroup,
  command: CommandsGroup,
  token: TokensGroup,
} as const;

export type {
  ComponentOption,
  TagOption,
  BreakpointOption,
  PageOption,
  CommandOption,
  TokenOption,
};

export {
  ComponentsGroup,
  TagsGroup,
  BreakpointsGroup,
  PagesGroup,
  CommandsGroup,
  TokensGroup,
};
