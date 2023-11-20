import { componentAttribute, idAttribute } from "../props";

export type AnyComponent = React.ForwardRefExoticComponent<
  Omit<
    React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>,
    "ref"
  > & {
    [componentAttribute]: string;
    [idAttribute]: string;
  } & React.RefAttributes<HTMLElement>
>;

export type Components = Map<string, AnyComponent>;
