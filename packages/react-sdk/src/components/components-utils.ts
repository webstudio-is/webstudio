import * as components from "./components";
import { registeredComponents } from "./index";
import { componentAttribute, idAttribute } from "../tree";

export type ComponentName = keyof typeof components;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ForwardRefExoticComponent<
  Omit<
    React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>,
    "ref"
  > & {
    [componentAttribute]: string;
    [idAttribute]: string;
  } & React.RefAttributes<HTMLElement>
>;

/**
 * Now used only in builder app
 * @todo Consider using the same approach in the builder app as in the published apps . A dynamic import is needed
 */
export const getComponent = (name: string): undefined | AnyComponent => {
  return registeredComponents != null && name in registeredComponents
    ? (registeredComponents[name as ComponentName] as never)
    : (components[name as ComponentName] as never);
};

/**
 * The application imports only the components it uses, then pass them to createGetComponent i.e.
 * getComponent = createGetComponent({ Box, BlaBla })
 * <RootInstance data={data} getComponent={getComponent} />
 * see example /packages/sdk-size-test/app/routes/$.tsx
 **/
export const createGetComponent = (comps: Partial<typeof components>) => {
  return (name: string): undefined | AnyComponent => {
    return registeredComponents != null && name in registeredComponents
      ? (registeredComponents[name as ComponentName] as never)
      : (comps[name as ComponentName] as never);
  };
};

export type GetComponent = typeof getComponent;
