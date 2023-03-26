import * as components from "./components";
import { registeredComponents } from "./index";

export type ComponentName = keyof typeof components;

/**
 * We need to define component names manually here, instead of using Object.keys(components)
 * Otherwise every component would be included in the bundle, even if it is not used
 *
 * @todo this list should not be hardcoded!
 */
const componentNames = Object.keys({
  Box: 1,
  Body: 1,
  TextBlock: 1,
  Heading: 1,
  Paragraph: 1,
  Link: 1,
  LinkBlock: 1,
  RichTextLink: 1,
  Span: 1,
  Bold: 1,
  Italic: 1,
  Superscript: 1,
  Subscript: 1,
  Button: 1,
  Input: 1,
  Form: 1,
  Image: 1,
  Blockquote: 1,
  List: 1,
  ListItem: 1,
  Separator: 1,
  Code: 1,
} satisfies { [K in keyof typeof components]: 1 }) as Array<
  keyof typeof components
>;

export const getComponentNames = (): ComponentName[] => {
  const uniqueNames = new Set([
    ...componentNames,
    ...Object.keys(registeredComponents || {}),
  ]);

  return Array.from(uniqueNames) as ComponentName[];
};

/**
 * Now used only in builder app
 * @todo Consider using the same approach in the builder app as in the published apps . A dynamic import is needed
 */
export const getComponent = (
  name: string
): undefined | (typeof components)[ComponentName] => {
  return registeredComponents != null && name in registeredComponents
    ? (registeredComponents[
        name as ComponentName
      ] as (typeof components)[ComponentName])
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
        ] as (typeof components)[ComponentName])
      : comps[name as ComponentName];
  };
};

export type GetComponent = typeof getComponent;
