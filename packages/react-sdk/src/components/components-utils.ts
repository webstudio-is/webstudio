import { componentAttribute, idAttribute, selectorIdAttribute } from "../props";

export type AnyComponent = React.ForwardRefExoticComponent<
  Omit<
    React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>,
    "ref"
  > &
    WebstudioComponentSystemProps &
    React.RefAttributes<HTMLElement>
>;

export type Components = Map<string, AnyComponent>;

export type WebstudioComponentSystemProps = {
  [componentAttribute]: string;
  [idAttribute]: string;
  [selectorIdAttribute]: string;
};
