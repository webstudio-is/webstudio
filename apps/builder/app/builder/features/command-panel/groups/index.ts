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
import {
  DuplicateTokensGroup,
  type DuplicateTokenOption,
} from "./duplicate-tokens-group";
import {
  $dataVariableOptions,
  DataVariablesGroup,
  type DataVariableOption,
} from "./data-variables-group";
import {
  $cssVariableOptions,
  CssVariablesGroup,
  type CssVariableOption,
} from "./css-variables-group";
import {
  $instanceOptions,
  InstancesGroup,
  type InstanceOption,
} from "./instances-group";

export type Option =
  | ComponentOption
  | TagOption
  | BreakpointOption
  | PageOption
  | CommandOption
  | TokenOption
  | DuplicateTokenOption
  | DataVariableOption
  | CssVariableOption
  | InstanceOption;

export type OptionByType<T extends Option["type"]> = Extract<
  Option,
  { type: T }
>;

export const $allOptions = computed(
  [
    $componentOptions,
    $tagOptions,
    $breakpointOptions,
    $pageOptions,
    $commandOptions,
    $tokenOptions,
    $dataVariableOptions,
    $cssVariableOptions,
    $instanceOptions,
  ],
  (
    componentOptions,
    tagOptions,
    breakpointOptions,
    pageOptions,
    commandOptions,
    tokenOptions,
    dataVariableOptions,
    cssVariableOptions,
    instanceOptions
  ) => [
    ...commandOptions,
    ...componentOptions,
    ...pageOptions,
    ...breakpointOptions,
    ...tagOptions,
    ...tokenOptions,
    ...dataVariableOptions,
    ...cssVariableOptions,
    ...instanceOptions,
  ]
);

type GroupComponent<T extends Option["type"]> = (props: {
  options: OptionByType<T>[];
}) => JSX.Element;

export const groups: {
  [K in Option["type"]]: GroupComponent<K>;
} = {
  component: ComponentsGroup,
  tag: TagsGroup,
  breakpoint: BreakpointsGroup,
  page: PagesGroup,
  command: CommandsGroup,
  token: TokensGroup,
  duplicateToken: DuplicateTokensGroup,
  dataVariable: DataVariablesGroup,
  cssVariable: CssVariablesGroup,
  instance: InstancesGroup,
};

export type {
  ComponentOption,
  TagOption,
  BreakpointOption,
  PageOption,
  CommandOption,
  TokenOption,
  DuplicateTokenOption,
  DataVariableOption,
  CssVariableOption,
  InstanceOption,
};

export {
  ComponentsGroup,
  TagsGroup,
  BreakpointsGroup,
  PagesGroup,
  CommandsGroup,
  TokensGroup,
  DuplicateTokensGroup,
  DataVariablesGroup,
  CssVariablesGroup,
  InstancesGroup,
};
