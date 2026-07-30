import { useStore } from "@nanostores/react";
import { useBindingState } from "~/builder/shared/bindable-expression";
import { $selectedInstanceScope } from "../shared";

export const useBindableControl = ({
  boundExpression,
  fallbackExpression,
}: {
  boundExpression?: string;
  fallbackExpression: string;
}) => {
  const { scope, aliases } = useStore($selectedInstanceScope);
  const bindingState = useBindingState(boundExpression);
  const bound = boundExpression !== undefined;
  const expression = boundExpression ?? fallbackExpression;
  return { expression, bound, scope, aliases, bindingState };
};
