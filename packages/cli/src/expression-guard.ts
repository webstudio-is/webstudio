/** Validate saved build expressions before they become published JavaScript. */
import {
  parse,
  parseExpressionAt,
  type AnyNode,
  type Node,
  type Program,
} from "acorn";
import { full, simple } from "acorn-walk";
import {
  isValidExpression,
  lintExpression,
  parseStaticMemberPath,
} from "@webstudio-is/expression";
import {
  type Instance,
  type Page,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";

// Match the metadata generator's treatment of plain text.
const normalizeStringExpression = (expression: string) => {
  const trimmedExpression = expression.trim();
  if (isValidExpression(trimmedExpression)) {
    if (
      parseStaticMemberPath(trimmedExpression)?.length === 1 &&
      trimmedExpression !== "undefined" &&
      trimmedExpression.includes("$ws$") === false
    ) {
      return JSON.stringify(expression);
    }
    return expression;
  }
  if (trimmedExpression.includes("$ws$")) {
    return expression;
  }
  return JSON.stringify(expression);
};

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

const checkSource = (expression: string) => {
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

  // 3. Keep the expression subset supported by the editor. The generator
  // replaces names outside the data scope with undefined.
  const [lintError] = lintExpression({
    expression,
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

  simple(root, {
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

const analyze = (expression: string): boolean => {
  try {
    checkSource(expression);
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
 * writes such names itself.
 */
export const checkExpression = (expression: string): boolean =>
  analyze(expression);

export type Violation = {
  instanceId?: Instance["id"];
  pageId?: Page["id"];
  resourceId?: Resource["id"];
  field: string;
};

type Items<Item> = ReadonlyMap<string, Item> | readonly Item[];

export type FindViolationsInput = {
  instances?: Items<Instance>;
  props?: Items<Prop>;
  resources?: Items<Resource>;
  /** `getAllPages(pages)`: every page, the home page included. */
  pages?: readonly Page[];
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

const checkTagProp = (prop: Prop): boolean =>
  prop.type === "string" && checkTag(prop.value);

/**
 * One walk over everything in a build that becomes code: every
 * expression-typed prop and instance child, every action's args,
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
        });
      }
    });
  }

  for (const prop of valuesOf(props)) {
    if (tagPropNames.has(prop.name)) {
      // an owner that does not exist is never rendered
      const owner = instanceById.get(prop.instanceId);
      if (owner !== undefined && componentsWithTagProps.has(owner.component)) {
        if (checkTagProp(prop) === false) {
          violations.push({
            instanceId: prop.instanceId,
            field: `props.${prop.name}`,
          });
        }
      }
    }
    if (prop.type === "expression") {
      if (checkExpression(prop.value) === false) {
        violations.push({
          instanceId: prop.instanceId,
          field: `props.${prop.name}`,
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
            });
          }
        });
      });
    }
  }

  for (const resource of valuesOf(resources)) {
    const checkValue = (field: string, expression: string) => {
      if (checkExpression(expression) === false) {
        violations.push({ resourceId: resource.id, field });
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
      checkField(
        `meta.custom[${JSON.stringify(custom.property)}].content`,
        custom.content,
        true
      );
    });
  }

  return violations;
};
