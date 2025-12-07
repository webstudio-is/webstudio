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
  $dataVariableOptions,
  DataVariablesGroup,
  type DataVariableOption,
} from "./data-variables-group";

export type Option =
  | ComponentOption
  | TagOption
  | BreakpointOption
  | PageOption
  | CommandOption
  | TokenOption
  | DataVariableOption;

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
  ],
  (
    componentOptions,
    tagOptions,
    breakpointOptions,
    pageOptions,
    commandOptions,
    tokenOptions,
    dataVariableOptions
  ) => [
    ...componentOptions,
    ...tagOptions,
    ...breakpointOptions,
    ...pageOptions,
    ...commandOptions,
    ...tokenOptions,
    ...dataVariableOptions,
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
  dataVariable: DataVariablesGroup,
};

export type {
  ComponentOption,
  TagOption,
  BreakpointOption,
  PageOption,
  CommandOption,
  TokenOption,
  DataVariableOption,
};

export {
  ComponentsGroup,
  TagsGroup,
  BreakpointsGroup,
  PagesGroup,
  CommandsGroup,
  TokensGroup,
  DataVariablesGroup,
};
