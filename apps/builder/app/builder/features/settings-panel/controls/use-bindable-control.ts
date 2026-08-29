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
import { updateExternalContentFrontmatter } from "~/shared/external-content-roots";
import {
  getSelectedContentBlockDocumentBindingPath,
  getSelectedContentBlockExpressionMode,
  isObjectPathWritable,
} from "~/shared/content-block-document";
import { $selectedInstanceScope } from "../shared";
import type {
  ExpressionBinding,
  ExpressionBindingMode,
} from "@webstudio-is/sdk";

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
  boundExpression?: Pick<ExpressionBinding, "value" | "mode">;
  fallbackExpression: string;
}) => {
  const { scope, aliases } = useStore($selectedInstanceScope);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const externalContentRoots = useStore($externalContentRoots);
  const isContentMode = useStore($isContentMode);
  const bindingState = useBindingState(boundExpression?.value);
  const externalEntry =
    selectedInstanceSelector === undefined
      ? undefined
      : findExternalContentRootEntryBySelector(
          externalContentRoots,
          selectedInstanceSelector
        );
  const externalRoot = externalEntry?.[1];
  const frontmatterPath =
    isContentMode &&
    boundExpression !== undefined &&
    selectedInstanceSelector !== undefined
      ? getSelectedContentBlockDocumentBindingPath({
          binding: {
            type: "expression",
            ...boundExpression,
          },
          instanceSelector: selectedInstanceSelector,
          instances: $instances.get(),
          props: $props.get(),
          sourceBlockInstanceId: externalRoot?.sourceBlockInstanceId,
          renderedBlockInstanceId: externalRoot?.blockInstanceId,
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
  const expression = boundExpression?.value ?? fallbackExpression;
  const writeBoundValue =
    frontmatterPath !== undefined &&
    externalEntry !== undefined &&
    isEditableFrontmatterBinding
      ? (value: unknown) =>
          updateExternalContentFrontmatter({
            rootKey: externalEntry[0],
            path: frontmatterPath,
            value,
          })
      : undefined;
  const getExpressionMode = (value: string): ExpressionBindingMode => {
    if (selectedInstanceSelector === undefined) {
      return "read";
    }
    return getSelectedContentBlockExpressionMode({
      expression: value,
      instanceSelector: selectedInstanceSelector,
      instances: $instances.get(),
      props: $props.get(),
      sourceBlockInstanceId: externalRoot?.sourceBlockInstanceId,
      renderedBlockInstanceId: externalRoot?.blockInstanceId,
    });
  };
  return {
    expression,
    bound,
    scope,
    aliases,
    getExpressionMode,
    writeBoundValue,
    ...getBindableControlPresentation({
      bindingState,
      isFrontmatterBinding: frontmatterPath !== undefined,
      isEditableFrontmatterBinding,
    }),
  };
};
