import { useStore } from "@nanostores/react";
import {
  useBindingState,
  type BindingState,
} from "~/builder/shared/bindable-expression";
import {
  $isContentMode,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";
import {
  $externalContentRoots,
  findExternalContentRootEntryBySelector,
} from "~/shared/external-content-mutations";
import {
  getSelectedContentBlockDocumentBindingPath,
  isObjectPathWritable,
} from "~/shared/content-block-document";
import { $selectedInstanceScope } from "../shared";

export const getBindableControlPresentation = ({
  bindingState,
  isFrontmatterBinding,
  isEditableFrontmatterBinding,
}: {
  bindingState: BindingState;
  isFrontmatterBinding: boolean;
  isEditableFrontmatterBinding: boolean;
}) => ({
  bindingState: {
    ...bindingState,
    overwritable:
      isEditableFrontmatterBinding || bindingState.overwritable === true,
  },
  showBinding: isFrontmatterBinding === false,
});

export const useBindableControl = ({
  boundExpression,
  fallbackExpression,
}: {
  boundExpression?: string;
  fallbackExpression: string;
}) => {
  const { scope, aliases } = useStore($selectedInstanceScope);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const externalContentRoots = useStore($externalContentRoots);
  const isContentMode = useStore($isContentMode);
  const bindingState = useBindingState(boundExpression);
  const externalRoot =
    selectedInstanceSelector === undefined
      ? undefined
      : findExternalContentRootEntryBySelector(
          externalContentRoots,
          selectedInstanceSelector
        )?.[1];
  const frontmatterPath =
    isContentMode &&
    boundExpression !== undefined &&
    selectedInstanceSelector !== undefined
      ? getSelectedContentBlockDocumentBindingPath({
          expression: boundExpression,
          instanceSelector: selectedInstanceSelector,
          instances: $instances.get(),
          props: $props.get(),
          sourceBlockInstanceId:
            externalRoot?.sourceBlockInstanceId ??
            externalRoot?.blockInstanceId,
        })
      : undefined;
  const isEditableFrontmatterBinding =
    frontmatterPath !== undefined &&
    externalRoot?.document !== undefined &&
    isObjectPathWritable({
      value: externalRoot.document.frontmatter.properties,
      path: frontmatterPath,
    });
  const bound = boundExpression !== undefined;
  const expression = boundExpression ?? fallbackExpression;
  return {
    expression,
    bound,
    scope,
    aliases,
    ...getBindableControlPresentation({
      bindingState,
      isFrontmatterBinding: frontmatterPath !== undefined,
      isEditableFrontmatterBinding,
    }),
  };
};
