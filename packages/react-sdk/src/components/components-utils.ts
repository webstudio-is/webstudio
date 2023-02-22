import * as components from "./components";
import { registeredComponents } from "./index";

export type ComponentName = keyof typeof components;

/**
 * We need to define component names manually here, instead of using Object.keys(components)
 * Otherwise every component would be included in the bundle, even if it is not used
 */
const componentNames = [
  "Box",
  "Body",
  "TextBlock",
  "Heading",
  "Paragraph",
  "Link",
  "RichTextLink",
  "Span",
  "Bold",
  "Italic",
  "Superscript",
  "Subscript",
  "Button",
  "Input",
  "Form",
  "Image",
  "Blockquote",
  "List",
  "ListItem",
] as const;

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

const typesEqual = <A, B>(a: Equals<A, B>) => undefined;

/**
 * Typecheck that
 * - all component names are included in the componentNames array
 * - there are no nonexistent component names in the componentNames array
 **/
typesEqual<ComponentName, typeof componentNames[number]>(true);

export const getComponentNames = (): ComponentName[] => {
  const uniqueNames = new Set([
    ...componentNames,
    ...Object.keys(registeredComponents || {}),
  ]);

  return [...uniqueNames.values()] as ComponentName[];
};

/**
 * Now used only in builder app
 * @todo Consider using the same approach in the builder app as in the published apps . A dynamic import is needed
 */
export const getComponent = (
  name: string
): undefined | typeof components[ComponentName] => {
  return registeredComponents != null && name in registeredComponents
    ? (registeredComponents[
        name as ComponentName
      ] as typeof components[ComponentName])
    : components[name as ComponentName];
};

/**
 * The application imports only the components it uses, then pass them to createGetComponent i.e.
 * getComponent = createGetComponent({ Box, BlaBla })
 * <RootInstance data={data} getComponent={getComponent} />
 * see example /packages/sdk-size-test/app/routes/$.tsx
 **/
export const createGetComponent = (comps: Partial<typeof components>) => {
  return (name: string) => {
    return registeredComponents != null && name in registeredComponents
      ? (registeredComponents[
          name as ComponentName
        ] as typeof components[ComponentName])
      : comps[name as ComponentName];
  };
};

export type GetComponent = typeof getComponent;
