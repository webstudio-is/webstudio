/** Validate saved build expressions before they become published JavaScript. */
import {
  parse,
  parseExpressionAt,
  type AnyNode,
  type Node,
  type Program,
} from "acorn";
import { ancestor, full } from "acorn-walk";
import { lintExpression } from "@webstudio-is/expression";
import { decodeDataVariableId } from "./expression";
import { normalizeStringExpression } from "./page-meta-expression";
import type { Instance } from "./schema/instances";
import type { Page } from "./schema/pages";
import type { Prop } from "./schema/props";
import type { Resource } from "./schema/resources";

const reject: () => never = () => {
  throw new Error("Invalid expression");
};

// Keys that reach the Function constructor or the prototype chain from a value.
// The call that would use them is already outside the safe subset; these are
// refused as well so a future gap in lintExpression is not one here.
const dangerousMemberKeys = new Set([
  "constructor",
  "__proto__",
  "prototype",
  "caller",
  "arguments",
]);

// Action event values and the fields returned by a managed Form.
const allowedArgChains = new Set([
  "target.value",
  "target.checked",
  "currentTarget.value",
  "currentTarget.checked",
  "errors",
  "results",
]);

// The node types of the safe subset, which is what lintExpression has a
// visitor for plus the nodes that live inside them. A type that is not here is
// refused even if lintExpression has no opinion about it.
const allowedNodeTypes = new Set([
  "Literal",
  "Identifier",
  "ArrayExpression",
  "ObjectExpression",
  "Property",
  "SpreadElement",
  "UnaryExpression",
  "BinaryExpression",
  "LogicalExpression",
  "MemberExpression",
  "ConditionalExpression",
  "TemplateLiteral",
  "TemplateElement",
  "ChainExpression",
  "AssignmentExpression",
  "CallExpression",
]);

const relationalOperators = new Set(["<", ">", "<=", ">="]);

const isRelational = (node: Node) => {
  const anyNode = node as AnyNode;
  return (
    anyNode.type === "BinaryExpression" &&
    relationalOperators.has(anyNode.operator)
  );
};

/** The string a computed member key is known to be, when it is known. */
const getStaticKey = (node: Node): undefined | string => {
  const anyNode = node as AnyNode;
  if (anyNode.type === "Literal") {
    return typeof anyNode.value === "string" ? anyNode.value : undefined;
  }
  if (anyNode.type === "TemplateLiteral" && anyNode.expressions.length === 0) {
    return anyNode.quasis[0]?.value.cooked ?? undefined;
  }
  if (anyNode.type === "BinaryExpression" && anyNode.operator === "+") {
    const left = getStaticKey(anyNode.left);
    const right = getStaticKey(anyNode.right);
    return left === undefined || right === undefined ? undefined : left + right;
  }
};

const argPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** An action's argument becomes a parameter name in the generated module. */
export const checkActionArg = (arg: string): boolean => {
  if (argPattern.test(arg)) {
    try {
      // a reserved word, or a name strict mode forbids, is not a parameter
      const program = parse(`(${arg}) => 0`, {
        ecmaVersion: "latest",
        sourceType: "module",
      });
      const statement = program.body[0];
      if (
        program.body.length === 1 &&
        statement.type === "ExpressionStatement" &&
        statement.expression.type === "ArrowFunctionExpression" &&
        statement.expression.params.length === 1 &&
        statement.expression.params[0].type === "Identifier" &&
        statement.expression.params[0].name === arg
      ) {
        return true;
      }
    } catch {
      // falls through to the rejection
    }
  }
  return false;
};

const plainTagPattern = /^[A-Za-z][A-Za-z0-9]*$/;
const disallowedTagNames = new Set(["script"]);

/**
 * An instance's tag, which the generator emits as `<${tag}>` for an element
 * and a component renders with createElement. XML pages may use tags beyond
 * the HTML list, so permit plain names while refusing script and JSX syntax.
 */
export const checkTag = (tag: string): boolean =>
  plainTagPattern.test(tag) && !disallowedTagNames.has(tag.toLowerCase());

type AnalyzeOptions = {
  allowAssignment?: boolean;
  /**
   * An identifier that is not a data variable is fine: the generator turns it
   * into `undefined`. Where the string is executed as written (an action, new
   * Function) it is not.
   */
  allowFreeIdentifiers?: boolean;
  args?: readonly string[];
  noCalls?: boolean;
};

const checkSource = (
  expression: string,
  {
    allowAssignment = false,
    allowFreeIdentifiers = false,
    args = [],
    noCalls = false,
  }: AnalyzeOptions
) => {
  if (expression.trim().length === 0) {
    reject();
  }

  // 1. The generator parses the source with parseExpressionAt and emits what
  // follows the first expression raw, so the first expression must be all of
  // it. Parens are preserved: without them a fully parenthesised binding ends
  // one character short. A comment can hide what transpileExpression looks for
  // with indexOf, and the HTML-like comments exist only in this script mode.
  let hasComment = false;
  let end: number;
  try {
    end = parseExpressionAt(expression, 0, {
      ecmaVersion: "latest",
      preserveParens: true,
      onComment: () => {
        hasComment = true;
      },
    }).end;
  } catch {
    return reject();
  }
  if (hasComment) {
    reject();
  }
  if (end !== expression.trimEnd().length) {
    reject();
  }

  // 2. The way lintExpression parses it, wrapped in parens as a module, which
  // must make exactly one statement: lintExpression never counts them, so
  // `1); while (true) {}; (2` lints clean.
  let program: Program;
  try {
    program = parse(`(${expression})`, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
  } catch {
    return reject();
  }
  const [statement] = program.body;
  if (program.body.length !== 1 || statement.type !== "ExpressionStatement") {
    reject();
  }
  const root = (statement as Extract<AnyNode, { type: "ExpressionStatement" }>)
    .expression;

  // 3. What lintExpression rejects. Its warnings (an identifier outside the
  // scope) are not enough: the walk below refuses those where they matter.
  const [lintError] = lintExpression({
    expression,
    allowAssignment,
  }).filter((diagnostic) => diagnostic.severity === "error");
  if (lintError) {
    reject();
  }

  // 4. The nodes the safe subset has no place for.
  full(root, (node) => {
    if (allowedNodeTypes.has(node.type) === false) {
      reject();
    }
  });

  const argNames = new Set(args.filter(checkActionArg));

  // 5. How each node is used.
  ancestor(root, {
    Identifier(node, _state, ancestors) {
      const { name } = node;
      if (argNames.has(name)) {
        // The root is the whole action: `$v = state`. An arg is allowed in two
        // places only, found by where it stands and not by what is around it:
        // as itself, the whole right of that assignment, or through an
        // allowlisted event or managed Form result property.
        // Anywhere else (inside an operator, an array, an object, a template,
        // a call) it can be read through, as in `(arg ?? 0).view.document`.
        const chain: string[] = [];
        let index = ancestors.length - 1;
        let current = ancestors[index];
        while (index > 0) {
          const parent = ancestors[index - 1] as AnyNode;
          if (parent.type !== "MemberExpression" || parent.object !== current) {
            break;
          }
          if (parent.computed || parent.property.type !== "Identifier") {
            reject();
          }
          chain.push((parent.property as { name: string }).name);
          current = parent;
          index -= 1;
        }
        if (chain.length > 0) {
          if (allowedArgChains.has(chain.join(".")) === false) {
            reject();
          }
          // where the chain ends up is the assignment target's rule, below
          return;
        }
        const parent = ancestors[ancestors.length - 2] as undefined | AnyNode;
        if (parent?.type === "AssignmentExpression" && parent.left === node) {
          // the assignment target's rule, below, names it
          return;
        }
        if (
          parent === root &&
          parent.type === "AssignmentExpression" &&
          parent.right === node
        ) {
          return;
        }
        // Form state is also used to append a history string. Keep this to
        // additions that end at the assignment's right side: the argument
        // cannot become a member, call target, or a second statement.
        let operand: AnyNode = node;
        for (
          let ancestorIndex = ancestors.length - 2;
          ancestorIndex >= 0;
          ancestorIndex -= 1
        ) {
          const ancestor = ancestors[ancestorIndex] as AnyNode;
          if (
            ancestor.type === "BinaryExpression" &&
            ancestor.operator === "+" &&
            (ancestor.left === operand || ancestor.right === operand)
          ) {
            operand = ancestor;
            continue;
          }
          if (
            ancestor === root &&
            ancestor.type === "AssignmentExpression" &&
            ancestor.right === operand &&
            operand !== node
          ) {
            return;
          }
          break;
        }
        reject();
      }
      if (
        allowFreeIdentifiers ||
        name === "undefined" ||
        decodeDataVariableId(name) !== undefined
      ) {
        return;
      }
      reject();
    },
    AssignmentExpression(node) {
      // lintExpression ignores the root of a member target, and the walk above
      // never visits a bare one, so the target is held to its rule here: a
      // data variable, never a part of one (a member of a variable can hold
      // anything, an argument included) and never an argument
      let target: AnyNode = node.left as AnyNode;
      while (target.type === "MemberExpression") {
        target = target.object as AnyNode;
      }
      if (target.type === "Identifier" && argNames.has(target.name)) {
        reject();
      }
      if (node.left.type !== "Identifier") {
        reject();
      }
      if (decodeDataVariableId(node.left.name) === undefined) {
        reject();
      }
    },
    MemberExpression(node) {
      if (node.computed) {
        const property = node.property as AnyNode;
        // a number can never name constructor, __proto__ or prototype
        const isNumber =
          property.type === "Literal" && typeof property.value === "number";
        if (isNumber === false) {
          const key = getStaticKey(node.property);
          // JavaScript turns any other key into a string at run time: an array
          // (["constructor"] is "constructor"), a template with a hole, a
          // conditional, a call's result or a variable's value. Without
          // knowing which string, the key could name the Function constructor,
          // which then runs any code as a value (laundered through an
          // allowlisted call such as `({ toString: Function }).toString(body)`),
          // so only a number or a string known in the source is a key.
          if (key === undefined) {
            reject();
          }
          if (dangerousMemberKeys.has(key)) {
            reject();
          }
        }
        return;
      }
      const key =
        node.property.type === "Identifier" ? node.property.name : undefined;
      if (key !== undefined && dangerousMemberKeys.has(key)) {
        reject();
      }
    },
    CallExpression(node) {
      if (noCalls) {
        reject();
      }
      // lintExpression takes `x[replace]()` for the allowlisted method. The key
      // rule refuses that key first; this stays as the second line, should a
      // computed key ever be allowed again.
      if (node.callee.type === "MemberExpression" && node.callee.computed) {
        reject();
      }
    },
    Literal(node) {
      if ("regex" in node && node.regex) {
        reject();
      }
      // Large BigInt powers and products can stall published rendering without
      // any function call. Builder-generated expressions do not use BigInt.
      if ("bigint" in node && node.bigint !== undefined) {
        reject();
      }
    },
    Property(node) {
      // the walk visits a key only when it is computed, and a key written as a
      // literal is not, so a big integer there is asked for here: the rule is
      // "no big integer literal anywhere", not "none that is computed with"
      if (
        node.key.type === "Literal" &&
        "bigint" in node.key &&
        node.key.bigint !== undefined
      ) {
        reject();
      }
    },
    UnaryExpression(node) {
      // `delete v.a` lints clean and the generator emits `delete v?.a`, which
      // mutates the object it is given: a variable's initial value is a
      // module-level constant shared by every request of the site.
      if (node.operator === "delete") {
        reject();
      }
    },
    BinaryExpression(node) {
      // TypeScript reads `a < b > (c)` and ``a < b > `c` `` as a call with type
      // arguments, JavaScript as comparisons, and the generated module is
      // TypeScript. Nothing legitimate chains comparisons.
      if (
        relationalOperators.has(node.operator) &&
        (isRelational(node.left) || isRelational(node.right))
      ) {
        reject();
      }
    },
  });
};

const analyze = (expression: string, options: AnalyzeOptions): boolean => {
  try {
    checkSource(expression, options);
    return true;
  } catch {
    // Parser limits and any unexpected error fail closed.
    return false;
  }
};

/**
 * An expression-typed prop, instance child or any other string that the
 * generator compiles with generateExpression. A name that is not a data
 * variable is allowed: the generator emits `undefined` for it, and the builder
 * writes such names itself (see the top of the file).
 */
export const checkExpression = (expression: string): boolean =>
  analyze(expression, { allowFreeIdentifiers: true });

/**
 * An action's code, which may assign to data variables and read its own args.
 * The generator leaves an identifier that is not a data variable in place, so
 * here only a data variable or one of the args is allowed.
 */
export const checkActionCode = (
  code: string,
  args: readonly string[]
): boolean => analyze(code, { allowAssignment: true, args, noCalls: true });

export type Violation = {
  instanceId?: Instance["id"];
  pageId?: Page["id"];
  resourceId?: Resource["id"];
  /**
   * Where in the instance, page or resource, as a path: `meta.description`. A
   * list entry that moves when its neighbours do is found by a name instead:
   * `meta.custom["og:title"].content`.
   */
  field: string;
  /** The string that is refused, to tell a violation that is still there from a new one. */
  value: string;
};

/**
 * What makes two violations the same one: the same field of the same page,
 * instance or resource holding the same string.
 */
export const getViolationKey = ({
  instanceId,
  pageId,
  resourceId,
  field,
  value,
}: Violation) => JSON.stringify([pageId, instanceId, resourceId, field, value]);

type Items<Item> = ReadonlyMap<string, Item> | readonly Item[];

export type FindViolationsInput = {
  instances?: Items<Instance>;
  props?: Items<Prop>;
  resources?: Items<Resource>;
  /** `getAllPages(pages)`: every page, the home page included. */
  pages?: readonly Page[];
  /** Finds the owner of a tag prop when `instances` contains only changed rows. */
  getInstance?: (instanceId: Instance["id"]) => Instance | undefined;
};

const valuesOf = <Item>(items: undefined | Items<Item>): Iterable<Item> => {
  if (items === undefined) {
    return [];
  }
  return Array.isArray(items)
    ? items
    : (items as ReadonlyMap<string, Item>).values();
};

// Only these built-in components use a tag prop to choose a rendered HTML element.
const tagPropNames = new Set(["tag", "data-ws-tag"]);
const componentsWithTagProps = new Set([
  "Box",
  "Text",
  "Heading",
  "DialogTitle",
]);

/**
 * The tag props of the given instances. findViolations judges a tag prop by the
 * component of its owner, so a save that touches only the owner (a component
 * change from `ws:element`, where the prop is an attribute, to `Box`, where it
 * is the tag) has to hand over the props it did not touch.
 */
export const getTagProps = (
  props: Iterable<Prop>,
  owners: { has: (instanceId: Instance["id"]) => boolean }
): Prop[] => {
  const tagProps: Prop[] = [];
  for (const prop of props) {
    if (tagPropNames.has(prop.name) && owners.has(prop.instanceId)) {
      tagProps.push(prop);
    }
  }
  return tagProps;
};

const checkTagProp = (prop: Prop): boolean =>
  prop.type === "string" && checkTag(prop.value);

const getValueText = (value: unknown) =>
  typeof value === "string" ? value : (JSON.stringify(value) ?? "");

/**
 * One walk over everything in a build that becomes code: every
 * expression-typed prop and instance child, every action's code and args,
 * every instance's tag and the `tag` and `data-ws-tag` props of the components
 * that render them, each page's title and meta, and each resource's url,
 * search parameter values, header values and body. Names are already emitted
 * with JSON.stringify by the generator. It skips
 * what the generator skips (a custom meta without a property, an empty
 * resource body), so it never refuses content the generator ignores.
 */
export const findViolations = ({
  instances,
  props,
  resources,
  pages,
  getInstance,
}: FindViolationsInput): Violation[] => {
  const violations: Violation[] = [];
  const instanceById = new Map<string, Instance>();
  for (const instance of valuesOf(instances)) {
    instanceById.set(instance.id, instance);
  }

  for (const instance of valuesOf(instances)) {
    // Older Element instances can store an empty tag, which renders as div.
    if (
      instance.tag !== undefined &&
      !(instance.component === "ws:element" && instance.tag === "")
    ) {
      if (checkTag(instance.tag) === false) {
        violations.push({
          instanceId: instance.id,
          field: "tag",
          value: instance.tag,
        });
      }
    }
    instance.children.forEach((child, index) => {
      if (child.type !== "expression") {
        return;
      }
      if (checkExpression(child.value) === false) {
        violations.push({
          instanceId: instance.id,
          field: `children[${index}]`,
          value: child.value,
        });
      }
    });
  }

  for (const prop of valuesOf(props)) {
    if (tagPropNames.has(prop.name)) {
      // an owner that does not exist is never rendered
      const owner =
        instanceById.get(prop.instanceId) ?? getInstance?.(prop.instanceId);
      if (owner !== undefined && componentsWithTagProps.has(owner.component)) {
        if (checkTagProp(prop) === false) {
          violations.push({
            instanceId: prop.instanceId,
            field: `props.${prop.name}`,
            value: getValueText(prop.value),
          });
        }
      }
    }
    if (prop.type === "expression") {
      if (checkExpression(prop.value) === false) {
        violations.push({
          instanceId: prop.instanceId,
          field: `props.${prop.name}`,
          value: prop.value,
        });
      }
      continue;
    }
    if (prop.type === "action") {
      prop.value.forEach((action, index) => {
        const field = `props.${prop.name}[${index}]`;
        action.args.forEach((arg, argIndex) => {
          if (checkActionArg(arg) === false) {
            violations.push({
              instanceId: prop.instanceId,
              field: `${field}.args[${argIndex}]`,
              value: arg,
            });
          }
        });
        if (checkActionCode(action.code, action.args) === false) {
          violations.push({
            instanceId: prop.instanceId,
            field: `${field}.code`,
            value: action.code,
          });
        }
      });
    }
  }

  for (const resource of valuesOf(resources)) {
    const checkValue = (field: string, expression: string) => {
      if (checkExpression(expression) === false) {
        violations.push({ resourceId: resource.id, field, value: expression });
      }
    };
    checkValue("url", resource.url);
    (resource.searchParams ?? []).forEach((searchParam, index) => {
      const field = `searchParams[${index}]`;
      checkValue(`${field}.value`, searchParam.value);
    });
    resource.headers.forEach((header, index) => {
      const field = `headers[${index}]`;
      checkValue(`${field}.value`, header.value);
    });
    // generateResources does not compile an empty body
    if (resource.body !== undefined && resource.body.length > 0) {
      checkValue("body", resource.body);
    }
    for (const field of [
      "recipientsExpression",
      "senderExpression",
      "subject",
      "body",
    ] as const) {
      const expression = resource.email?.[field];
      if (expression !== undefined) {
        checkValue(`email.${field}`, expression);
      }
    }
  }

  for (const page of pages ?? []) {
    const checkField = (
      field: string,
      expression: string | undefined,
      normalize = false
    ) => {
      if (expression === undefined) {
        return;
      }
      if (
        checkExpression(
          normalize ? normalizeStringExpression(expression) : expression
        ) === false
      ) {
        violations.push({
          pageId: page.id,
          field,
          value: expression,
        });
      }
    };
    const { meta } = page;
    checkField("title", page.title, true);
    checkField("meta.description", meta.description, true);
    checkField("meta.excludePageFromSearch", meta.excludePageFromSearch);
    checkField("meta.language", meta.language, true);
    checkField("meta.socialImageUrl", meta.socialImageUrl, true);
    checkField("meta.status", meta.status);
    checkField("meta.redirect", meta.redirect, true);
    checkField("meta.content", meta.content, true);
    (meta.custom ?? []).forEach((custom) => {
      // generatePageMeta does not emit a custom meta without a property
      if (custom.property.trim().length === 0) {
        return;
      }
      // found by its property, not its position: the field is half of the key
      // that tells a stored violation from a new one, and deleting or adding
      // an entry before it moves the position of one that did not change
      checkField(
        `meta.custom[${JSON.stringify(custom.property)}].content`,
        custom.content,
        true
      );
    });
  }

  return violations;
};
