// Minimal-yet-safe TypeScript typings for css-tree v3.x
// Covers: AST node types, parse/generate, walk/find, List, lexer API,
// value definition syntax helpers, and common utils used in this project.

declare module "css-tree" {
  // -------------------------------------------------
  // Common
  // -------------------------------------------------
  export interface SourceLocation {
    source: string;
    start: { offset: number; line: number; column: number };
    end: { offset: number; line: number; column: number };
  }

  export interface BaseNode {
    type: string;
    loc: SourceLocation | null;
  }

  // Doubly-linked list used by csstree
  export interface ListItem<T> {
    prev: ListItem<T> | null;
    next: ListItem<T> | null;
    data: T;
  }

  export class List<T> implements Iterable<T> {
    static createItem<T>(data: T): ListItem<T>;

    constructor();
    // iteration
    [Symbol.iterator](): IterableIterator<T>;
    // props
    readonly size: number;
    readonly isEmpty: boolean;
    readonly first: T | null;
    readonly last: T | null;
    // traversal helpers
    forEach(
      fn: (data: T, item: ListItem<T>, list: List<T>) => void,
      thisArg?: any
    ): void;
    forEachRight(
      fn: (data: T, item: ListItem<T>, list: List<T>) => void,
      thisArg?: any
    ): void;
    // conversion
    fromArray(items: T[]): this;
    toArray(): T[];
    toJSON(): T[];
    // mutation (minimal surface used by walkers)
    clear(): void;
    remove(item: ListItem<T>): ListItem<T>;
    insert(item: ListItem<T>, before?: ListItem<T> | null): void;
    insertData(data: T, before?: ListItem<T> | null): void;
    append(item: ListItem<T>): void;
    appendData(data: T): void;
    prepend(item: ListItem<T>): void;
    prependData(data: T): void;
    replace(oldItem: ListItem<T>, newItemOrList: ListItem<T> | List<T>): void;
  }

  // -------------------------------------------------
  // AST Nodes (as per docs/ast.md)
  // -------------------------------------------------
  export interface AnPlusB extends BaseNode {
    type: "AnPlusB";
    a: string | null;
    b: string | null;
  }
  export interface Atrule extends BaseNode {
    type: "Atrule";
    name: string;
    prelude: AtrulePrelude | Raw | null;
    block: Block | null;
  }
  export interface AtrulePrelude extends BaseNode {
    type: "AtrulePrelude";
    children: List<CssNode>;
  }
  export interface AttributeSelector extends BaseNode {
    type: "AttributeSelector";
    name: Identifier;
    matcher: string | null;
    value: StringNode | Identifier | null;
    flags: string | null;
  }
  export interface Block extends BaseNode {
    type: "Block";
    children: List<Atrule | Rule | Declaration>;
  }
  export interface Brackets extends BaseNode {
    type: "Brackets";
    children: List<CssNode>;
  }
  export interface CDC extends BaseNode {
    type: "CDC";
  }
  export interface CDO extends BaseNode {
    type: "CDO";
  }
  export interface ClassSelector extends BaseNode {
    type: "ClassSelector";
    name: string;
  }
  export interface Combinator extends BaseNode {
    type: "Combinator";
    name: string;
  }
  export interface Comment extends BaseNode {
    type: "Comment";
    value: string;
  }
  export interface Condition extends BaseNode {
    type: "Condition";
    kind: string;
    children: List<
      | Identifier
      | Feature
      | FeatureFunction
      | FeatureRange
      | SupportsDeclaration
    >;
  }
  export interface Declaration extends BaseNode {
    type: "Declaration";
    important: boolean | string;
    property: string;
    value: Value | Raw;
  }
  export interface DeclarationList extends BaseNode {
    type: "DeclarationList";
    children: List<Declaration | Atrule | Rule>;
  }
  export interface Dimension extends BaseNode {
    type: "Dimension";
    value: string;
    unit: string;
  }
  export interface Feature extends BaseNode {
    type: "Feature";
    kind: string;
    name: string;
    value: Identifier | NumberNode | Dimension | Ratio | FunctionNode | null;
  }
  export interface FeatureFunction extends BaseNode {
    type: "FeatureFunction";
    kind: string;
    feature: string;
    value: Declaration | Selector;
  }
  export interface FeatureRange extends BaseNode {
    type: "FeatureRange";
    kind: string;
    left: Identifier | NumberNode | Dimension | Ratio | FunctionNode;
    leftComparison: string;
    middle: Identifier | NumberNode | Dimension | Ratio | FunctionNode;
    rightComparison: string | null;
    right: Identifier | NumberNode | Dimension | Ratio | FunctionNode | null;
  }
  export interface FunctionNode extends BaseNode {
    type: "Function";
    name: string;
    children: List<CssNode>;
  }
  export interface GeneralEnclosed extends BaseNode {
    type: "GeneralEnclosed";
    kind: string;
    function: string | null;
    children: List<CssNode>;
  }
  export interface Hash extends BaseNode {
    type: "Hash";
    value: string;
  }
  export interface IdSelector extends BaseNode {
    type: "IdSelector";
    name: string;
  }
  export interface Identifier extends BaseNode {
    type: "Identifier";
    name: string;
  }
  export interface Layer extends BaseNode {
    type: "Layer";
    name: string;
  }
  export interface LayerList extends BaseNode {
    type: "LayerList";
    children: List<Layer>;
  }
  export interface MediaQuery extends BaseNode {
    type: "MediaQuery";
    modifier: string | null;
    mediaType: string | null;
    condition: Condition | null;
  }
  export interface MediaQueryList extends BaseNode {
    type: "MediaQueryList";
    children: List<MediaQuery>;
  }
  export interface NestingSelector extends BaseNode {
    type: "NestingSelector";
  }
  export interface Nth extends BaseNode {
    type: "Nth";
    nth: AnPlusB | Identifier;
    selector: SelectorList | null;
  }
  export interface NumberNode extends BaseNode {
    type: "Number";
    value: string;
  }
  export interface Operator extends BaseNode {
    type: "Operator";
    value: string;
  }
  export interface Parentheses extends BaseNode {
    type: "Parentheses";
    children: List<CssNode>;
  }
  export interface Percentage extends BaseNode {
    type: "Percentage";
    value: string;
  }
  export interface PseudoClassSelector extends BaseNode {
    type: "PseudoClassSelector";
    name: string;
    children: List<Raw> | null;
  }
  export interface PseudoElementSelector extends BaseNode {
    type: "PseudoElementSelector";
    name: string;
    children: List<Raw> | null;
  }
  export interface Ratio extends BaseNode {
    type: "Ratio";
    left: NumberNode | FunctionNode;
    right: NumberNode | FunctionNode | null;
  }
  export interface Raw extends BaseNode {
    type: "Raw";
    value: string;
  }
  export interface Rule extends BaseNode {
    type: "Rule";
    prelude: SelectorList | Raw;
    block: Block;
  }
  export interface Scope extends BaseNode {
    type: "Scope";
    root: SelectorList | Raw | null;
    limit: SelectorList | Raw | null;
  }
  export interface Selector extends BaseNode {
    type: "Selector";
    children: List<
      | TypeSelector
      | IdSelector
      | ClassSelector
      | AttributeSelector
      | PseudoClassSelector
      | PseudoElementSelector
      | Combinator
      | NestingSelector
    >;
  }
  export interface SelectorList extends BaseNode {
    type: "SelectorList";
    children: List<Selector | Raw>;
  }
  export interface StringNode extends BaseNode {
    type: "String";
    value: string;
  }
  export interface StyleSheet extends BaseNode {
    type: "StyleSheet";
    children: List<Comment | CDO | CDC | Atrule | Rule | Raw>;
  }
  export interface SupportsDeclaration extends BaseNode {
    type: "SupportsDeclaration";
    declaration: Declaration;
  }
  export interface TypeSelector extends BaseNode {
    type: "TypeSelector";
    name: string;
  }
  export interface UnicodeRange extends BaseNode {
    type: "UnicodeRange";
    value: string;
  }
  export interface Url extends BaseNode {
    type: "Url";
    value: string;
  }
  export interface Value extends BaseNode {
    type: "Value";
    children: List<CssNode>;
  }
  export interface WhiteSpace extends BaseNode {
    type: "WhiteSpace";
    value: string;
  }

  export type CssNode =
    | AnPlusB
    | Atrule
    | AtrulePrelude
    | AttributeSelector
    | Block
    | Brackets
    | CDC
    | CDO
    | ClassSelector
    | Combinator
    | Comment
    | Condition
    | Declaration
    | DeclarationList
    | Dimension
    | Feature
    | FeatureFunction
    | FeatureRange
    | FunctionNode
    | GeneralEnclosed
    | Hash
    | IdSelector
    | Identifier
    | Layer
    | LayerList
    | MediaQuery
    | MediaQueryList
    | NestingSelector
    | Nth
    | NumberNode
    | Operator
    | Parentheses
    | Percentage
    | PseudoClassSelector
    | PseudoElementSelector
    | Ratio
    | Raw
    | Rule
    | Scope
    | Selector
    | SelectorList
    | StringNode
    | StyleSheet
    | SupportsDeclaration
    | TypeSelector
    | UnicodeRange
    | Url
    | Value
    | WhiteSpace;

  // A plain-object form where children are arrays (for JSON, etc.)
  export type CssNodePlain = Omit<CssNode, "children" | "loc"> & {
    children?: CssNodePlain[] | null;
    loc?: SourceLocation | null;
  };

  // -------------------------------------------------
  // Parsing / Generation
  // -------------------------------------------------
  export type ParseContext =
    | "stylesheet"
    | "atrule"
    | "atrulePrelude"
    | "mediaQueryList"
    | "mediaQuery"
    | "rule"
    | "selectorList"
    | "selector"
    | "block"
    | "declarationList"
    | "declaration"
    | "value";

  export interface ParseOptions {
    context?: ParseContext;
    atrule?: string | null;
    positions?: boolean;
    onParseError?: (error: any, fallbackNode?: Raw) => void;
    onComment?: (value: string, loc: SourceLocation | null) => void;
    onToken?:
      | ((type: number, start: number, end: number, index: number) => void)
      | Array<{ type: number; start: number; end: number }>
      | null;
    filename?: string;
    offset?: number;
    line?: number;
    column?: number;
    parseAtrulePrelude?: boolean;
    parseRulePrelude?: boolean;
    parseValue?: boolean;
    parseCustomProperty?: boolean;
  }

  // Strict overloads by context
  export function parse(source: string): StyleSheet;
  export function parse(
    source: string,
    options: ParseOptions & { context?: "stylesheet" }
  ): StyleSheet;
  export function parse(
    source: string,
    options: ParseOptions & { context: "atrule" }
  ): Atrule;
  export function parse(
    source: string,
    options: ParseOptions & { context: "atrulePrelude" }
  ): AtrulePrelude;
  export function parse(
    source: string,
    options: ParseOptions & { context: "mediaQueryList" }
  ): MediaQueryList;
  export function parse(
    source: string,
    options: ParseOptions & { context: "mediaQuery" }
  ): MediaQuery;
  export function parse(
    source: string,
    options: ParseOptions & { context: "rule" }
  ): Rule;
  export function parse(
    source: string,
    options: ParseOptions & { context: "selectorList" }
  ): SelectorList;
  export function parse(
    source: string,
    options: ParseOptions & { context: "selector" }
  ): Selector;
  export function parse(
    source: string,
    options: ParseOptions & { context: "block" }
  ): Block;
  export function parse(
    source: string,
    options: ParseOptions & { context: "declarationList" }
  ): DeclarationList;
  export function parse(
    source: string,
    options: ParseOptions & { context: "declaration" }
  ): Declaration;
  export function parse(
    source: string,
    options: ParseOptions & { context: "value" }
  ): Value;
  // Fallback
  export function parse(source: string, options: ParseOptions): CssNode;

  export function generate(
    ast: CssNode,
    options: {
      sourceMap: true;
      decorator?: (node: CssNode) => any;
      mode?: "spec" | "safe";
    }
  ): { css: string; map: any };
  export function generate(
    ast: CssNode,
    options?: {
      sourceMap?: false;
      decorator?: (node: CssNode) => any;
      mode?: "spec" | "safe";
    }
  ): string;

  // -------------------------------------------------
  // Traversal helpers
  // -------------------------------------------------
  export type WalkHandler = (
    node: CssNode,
    item?: ListItem<CssNode>,
    list?: List<CssNode>
  ) => any;
  export interface WalkOptions {
    enter?: WalkHandler;
    leave?: WalkHandler;
    visit?: CssNode["type"] | null;
    reverse?: boolean;
  }
  export function walk(ast: CssNode, options: WalkOptions | WalkHandler): void;
  export function find(ast: CssNode, fn: WalkHandler): CssNode | null;
  export function findLast(ast: CssNode, fn: WalkHandler): CssNode | null;
  export function findAll(ast: CssNode, fn: WalkHandler): CssNode[];

  // -------------------------------------------------
  // Utils
  // -------------------------------------------------
  export function clone<T extends CssNode>(ast: T): T;
  export function fromPlainObject<T extends { children?: any }>(obj: T): T;
  export function toPlainObject<T extends { children?: any }>(ast: T): T;

  export interface PropertyInfo {
    basename: string;
    name: string;
    hack: string;
    vendor: string;
    prefix: string;
    custom: boolean;
  }
  export function property(name: string): PropertyInfo;

  export interface KeywordInfo {
    basename: string;
    name: string;
    vendor: string;
    prefix: string;
    custom: boolean;
  }
  export function keyword(name: string): KeywordInfo;

  export namespace ident {
    function decode(value: string): string;
    function encode(value: string): string;
  }
  export namespace string {
    function decode(value: string): string;
    function encode(value: string, preferSingleQuotes?: boolean): string;
  }
  export namespace url {
    function decode(value: string): string;
    function encode(value: string): string;
  }

  // -------------------------------------------------
  // Definition syntax (values) sub-API
  // -------------------------------------------------
  export namespace definitionSyntax {
    // AST nodes for definition syntax are intentionally minimal here
    interface Base {
      type: string;
    }
    interface Group extends Base {
      type: "Group";
      terms: Base[];
      combinator: " " | "|" | "||" | "&&";
      disallowEmpty: boolean;
      explicit: boolean;
    }
    interface Keyword extends Base {
      type: "Keyword";
      name: string;
    }
    interface Function extends Base {
      type: "Function";
      name: string;
    }
    interface String extends Base {
      type: "String";
      value: string;
    }
    interface Property extends Base {
      type: "Property";
      name: string;
    }
    interface Type extends Base {
      type: "Type";
      name: string;
      opts: Range | null;
    }
    interface Range extends Base {
      type: "Range";
      min: number | null;
      max: number | null;
    }
    interface Multiplier extends Base {
      type: "Multiplier";
      comma: boolean;
      min: number;
      max: number;
      term: Base;
    }

    type Node =
      | Group
      | Keyword
      | Function
      | String
      | Property
      | Type
      | Range
      | Multiplier
      | Base;

    function parse(source: string): Node;
    function walk(
      node: Node,
      options:
        | { enter?: (n: Node) => void; leave?: (n: Node) => void }
        | ((n: Node) => void),
      context?: any
    ): void;
    function generate(
      node: Node,
      options?: {
        forceBraces?: boolean;
        compact?: boolean;
        decorate?: (content: string, node: Node) => string;
      }
    ): string;
  }

  // -------------------------------------------------
  // Lexer
  // -------------------------------------------------
  export interface AtruleSyntaxConfig {
    prelude?: string | definitionSyntax.Node | ((ref?: any) => any) | null;
    descriptors?: Record<
      string,
      string | definitionSyntax.Node | ((ref?: any) => any)
    > | null;
  }

  export interface LexerConfig {
    generic?: boolean;
    cssWideKeywords?: string[];
    units?: Record<string, string[]>;
    types?: Record<
      string,
      string | definitionSyntax.Node | ((ref?: any) => any)
    >;
    atrules?: Record<string, AtruleSyntaxConfig>;
    properties?: Record<
      string,
      string | definitionSyntax.Node | ((ref?: any) => any)
    >;
  }

  export interface MatchResult {
    matched: any;
    error: Error | null;
    iterations: number;
    isType(node: CssNode | null | undefined, name: string): boolean;
    getTrace(
      node: CssNode | null | undefined
    ): Array<{ type: string; name: string }>;
  }

  export interface FragmentResult {
    parent: List<CssNode>;
    nodes: List<CssNode>;
  }

  export class Lexer {
    constructor(config?: LexerConfig, syntax?: any, structure?: any);

    cssWideKeywords: string[];
    units: Record<string, string[]>;

    checkStructure(
      ast: CssNode
    ): false | Array<{ node: CssNode; message: string }>;

    checkAtruleName(atruleName: string): Error | void;
    checkAtrulePrelude(
      atruleName: string,
      prelude?: string | CssNode | null
    ): Error | void;
    checkAtruleDescriptorName(
      atruleName: string,
      descriptorName: string
    ): Error | void;
    checkPropertyName(propertyName: string): Error | void;

    matchAtrulePrelude(
      atruleName: string,
      prelude?: string | CssNode | null
    ): MatchResult;
    matchAtruleDescriptor(
      atruleName: string,
      descriptorName: string,
      value: string | CssNode
    ): MatchResult;
    matchDeclaration(node: CssNode): MatchResult;
    matchProperty(propertyName: string, value: string | CssNode): MatchResult;
    matchType(typeName: string, value: string | CssNode): MatchResult;
    match(
      syntax: string | definitionSyntax.Node,
      value: string | CssNode
    ): MatchResult;

    findValueFragments(
      propertyName: string,
      value: Value,
      type: string,
      name: string
    ): FragmentResult[];
    findDeclarationValueFragments(
      declaration: Declaration,
      type: string,
      name: string
    ): FragmentResult[];
    findAllFragments(
      ast: CssNode,
      type: string,
      name: string
    ): FragmentResult[];

    // descriptor getters
    getAtrule(atruleName: string, fallbackBasename?: boolean): any | null;
    getAtrulePrelude(
      atruleName: string,
      fallbackBasename?: boolean
    ): any | null;
    getAtruleDescriptor(atruleName: string, name: string): any | null;
    getProperty(propertyName: string, fallbackBasename?: boolean): any | null;
    getType(name: string): any | null;

    validate(): null | {
      errors: string[];
      types: string[];
      properties: string[];
    };
    dump(syntaxAsAst?: boolean, pretty?: boolean): any;
    toString(): string;
  }

  export const lexer: Lexer;
  export function createLexer(config?: LexerConfig): Lexer;

  // -------------------------------------------------
  // Tokenizer / misc exports (lightly typed)
  // -------------------------------------------------
  export const tokenTypes: Record<string, number>;
  export const tokenNames: string[];
  export function tokenize(input: string): IterableIterator<any>;

  // Syntax factory and forking
  export function createSyntax(config: any): any;
  export function fork(ext?: any): any;
}

// Optional subpath module shims to enable tree-shake-style imports
declare module "css-tree/lexer" {
  export * from "css-tree";
}
declare module "css-tree/parser" {
  export type { ParseOptions, CssNode } from "css-tree";
  export { parse as default } from "css-tree";
}
declare module "css-tree/generator" {
  export { generate as default } from "css-tree";
}
declare module "css-tree/walker" {
  export {
    walk,
    find,
    findAll,
    findLast,
    WalkOptions,
    WalkHandler,
  } from "css-tree";
}
declare module "css-tree/definition-syntax" {
  export { definitionSyntax } from "css-tree";
}
declare module "css-tree/utils" {
  export {
    List,
    ListItem,
    clone,
    fromPlainObject,
    toPlainObject,
    property,
    keyword,
    ident,
    string,
    url,
  } from "css-tree";
}
