import {
  type ButtonHTMLAttributes,
  type RefObject,
  forwardRef,
  useMemo,
  useRef,
  useState,
  createContext,
  type ReactNode,
} from "react";
import {
  DotIcon,
  InfoCircleIcon,
  PlusIcon,
  ResetIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import {
  Box,
  Button,
  CssValueListArrowFocus,
  CssValueListItem,
  DialogTitleActions,
  DialogClose,
  DialogTitle,
  Flex,
  FloatingPanel,
  Label,
  ScrollArea,
  SmallIconButton,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import {
  decodeDataSourceVariable,
  getExpressionIdentifiers,
  lintExpression,
} from "@webstudio-is/sdk";
import {
  ExpressionEditor,
  formatValuePreview,
  type EditorApi,
} from "./expression-editor";
import {
  $dataSourceVariables,
  $isDesignMode,
  computeExpression,
} from "~/shared/nano-states";
import { useStore } from "@nanostores/react";

export const evaluateExpressionWithinScope = (
  expression: string,
  scope: Record<string, unknown>
) => {
  const variables = new Map<string, unknown>();
  for (const [name, value] of Object.entries(scope)) {
    const decodedName = decodeDataSourceVariable(name);
    if (decodedName) {
      variables.set(decodedName, value);
    }
  }

  return computeExpression(expression, variables);
};

const BindingPanel = ({
  scope,
  aliases,
  valueError,
  value,
  onChange,
  onSave,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  valueError?: string;
  value: string;
  onChange: () => void;
  onSave: (value: string, invalid: boolean) => void;
}) => {
  const editorApiRef = useRef<undefined | EditorApi>(undefined);
  const [expression, setExpression] = useState(value);
  const usedIdentifiers = useMemo(
    () => getExpressionIdentifiers(value),
    [value]
  );
  const [errorsCount, setErrorsCount] = useState<number>(0);
  const [touched, setTouched] = useState(false);
  const scopeEntries = Object.entries(scope);

  const validate = (expression: string) => {
    const diagnostics = lintExpression({
      expression,
      availableVariables: new Set(aliases.keys()),
    });
    setErrorsCount(diagnostics.length);
  };

  const updateExpression = (newExpression: string) => {
    setExpression(newExpression);
    onChange();
    validate(newExpression);
  };

  return (
    <ScrollArea
      css={{
        display: "flex",
        flexDirection: "column",
        width: theme.spacing[30],
      }}
    >
      <Box css={{ paddingBottom: theme.spacing[5] }}>
        <Flex gap="1" css={{ padding: theme.panel.padding }}>
          <Text variant="labelsSentenceCase">Variables</Text>
          <Tooltip
            variant="wrapped"
            content={
              "Click on the available variables in this scope to insert them into the Expression Editor."
            }
          >
            <InfoCircleIcon tabIndex={0} />
          </Tooltip>
        </Flex>
        {scopeEntries.length === 0 && (
          <Flex justify="center" align="center" css={{ py: theme.spacing[5] }}>
            <Text variant="labelsSentenceCase" align="center">
              No variables available
            </Text>
          </Flex>
        )}
        <CssValueListArrowFocus>
          {scopeEntries.map(([identifier, value], index) => {
            const name = aliases.get(identifier);
            const label =
              value === undefined
                ? name
                : `${name}: ${formatValuePreview(value)}`;
            return (
              <CssValueListItem
                key={identifier}
                id={identifier}
                index={index}
                label={<Label truncate>{label}</Label>}
                // mark all variables used in expression as selected
                active={usedIdentifiers.has(identifier)}
                // convert variable to expression
                onClick={() => {
                  editorApiRef.current?.replaceSelection(identifier);
                }}
                // expression editor blur is fired after pointer down even
                // preventing it allows to not trigger validation
                // and flickering error tooltip
                onPointerDown={(event) => {
                  event.preventDefault();
                }}
              />
            );
          })}
        </CssValueListArrowFocus>
      </Box>
      <Flex gap="1" css={{ padding: theme.panel.padding }}>
        <Text variant="labelsSentenceCase">Expression Editor</Text>
        <Tooltip
          variant="wrapped"
          content={
            <Text>
              Use JavaScript syntax to access variables along with comparison
              and arithmetic operators.
              <br />
              Use the dot notation to access nested object values:
              <Text variant="mono">Variable.nested.value</Text>
            </Text>
          }
        >
          <InfoCircleIcon tabIndex={0} />
        </Tooltip>
      </Flex>
      <Box css={{ padding: theme.panel.padding, pt: 0 }}>
        <ExpressionEditor
          editorApiRef={editorApiRef}
          scope={scope}
          aliases={aliases}
          color={
            (touched && errorsCount > 0) || valueError !== undefined
              ? "error"
              : undefined
          }
          autoFocus={true}
          value={expression}
          onChange={(value) => {
            updateExpression(value);
            setTouched(false);
          }}
          onChangeComplete={() => {
            onSave(expression, errorsCount > 0);
            setTouched(true);
          }}
        />
      </Box>
    </ScrollArea>
  );
};

const bindingOpacityProperty = "--ws-binding-opacity";

export const BindingControl = ({ children }: { children: ReactNode }) => {
  return (
    <Box
      css={{
        position: "relative",
        "&:hover": { [bindingOpacityProperty]: 1 },
      }}
    >
      {children}
    </Box>
  );
};

export type BindingVariant = "default" | "bound" | "overwritten";

const BindingButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant: BindingVariant;
    error?: string;
    value: string;
  }
>(({ variant, error, value, ...props }, ref) => {
  const expanded = props["aria-expanded"];
  const overwrittenMessage =
    variant === "overwritten" ? (
      <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
        <Text>Bound variable is overwritten with temporary value</Text>
        <Button
          color="dark"
          prefix={<ResetIcon />}
          css={{ flexGrow: 1 }}
          onClick={() => {
            const potentialVariableId = decodeDataSourceVariable(value);
            const dataSourceVariables = new Map($dataSourceVariables.get());
            if (potentialVariableId !== undefined) {
              dataSourceVariables.delete(potentialVariableId);
              $dataSourceVariables.set(dataSourceVariables);
            }
          }}
        >
          Reset value
        </Button>
      </Flex>
    ) : undefined;
  const tooltipContent = error ?? overwrittenMessage;
  return (
    // prevent giving content to tooltip when popover is open
    // to avoid button remounting and popover flickering
    // when switch between valid and error value
    <Tooltip content={expanded ? undefined : tooltipContent} delayDuration={0}>
      <SmallIconButton
        ref={ref}
        data-variant={variant}
        bleed={false}
        css={{
          // hide by default
          opacity: `var(${bindingOpacityProperty}, 0)`,
          position: "absolute",
          top: 0,
          left: 0,
          boxSizing: "border-box",
          padding: 2,
          // Because of the InputErrorsTooltip, we need to set zIndex to 1 (as InputErrorsTooltip needs an additional position relative wrapper)
          zIndex: 1,
          transform: "translate(-50%, -50%) scale(1)",
          transition: "transform 60ms, opacity 0ms 60ms",
          // https://easings.net/#easeInOutSine
          transitionTimingFunction: "cubic-bezier(0.37, 0, 0.63, 1)",
          "--dot-display": "block",
          "--plus-display": "none",
          "&[data-variant=bound], &[data-variant=overwritten]": {
            opacity: 1,
          },
          "&:hover, &:focus-visible, &[aria-expanded=true]": {
            // always show when interacted with
            opacity: 1,
            transform: `translate(-50%, -50%) scale(1.5)`,
            "--dot-display": "none",
            "--plus-display": "block",
          },
          "&:disabled": {
            display: "none",
          },
        }}
        {...props}
        icon={
          <Box
            css={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: theme.colors.backgroundStyleSourceToken,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              "&[data-variant=bound]": {
                backgroundColor: theme.colors.backgroundStyleSourceLocal,
              },
              "&[data-variant=overwritten]": {
                backgroundColor: theme.colors.borderOverwrittenMain,
              },
              "&[data-variant=error]": {
                backgroundColor: theme.colors.backgroundDestructiveMain,
              },
            }}
            data-variant={error ? "error" : variant}
          >
            <DotIcon
              size={14}
              fill="white"
              style={{ display: `var(--dot-display)` }}
            />
            <PlusIcon
              size={10}
              fill="white"
              style={{ display: `var(--plus-display)` }}
            />
          </Box>
        }
      />
    </Tooltip>
  );
});
BindingButton.displayName = "BindingButton";

const BindingPopoverContext = createContext<{
  containerRef?: RefObject<null | HTMLElement>;
  side?: "left" | "right";
}>({});

export const BindingPopoverProvider = BindingPopoverContext.Provider;

export const BindingPopover = ({
  scope,
  aliases,
  variant,
  validate,
  value,
  onChange,
  onRemove,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  variant: BindingVariant;
  validate?: (value: unknown) => undefined | string;
  value: string;
  onChange: (newValue: string) => void;
  onRemove: (evaluatedValue: unknown) => void;
}) => {
  const [isOpen, onOpenChange] = useState(false);
  const hasUnsavedChange = useRef<boolean>(false);
  const preventedClosing = useRef<boolean>(false);
  const isDesignMode = useStore($isDesignMode);

  if (!isDesignMode) {
    return;
  }

  const valueError = validate?.(evaluateExpressionWithinScope(value, scope));
  return (
    <FloatingPanel
      placement="right-start"
      open={isOpen}
      onOpenChange={(newOpen) => {
        // handle special case for popover close
        if (newOpen === false) {
          // prevent saving when changes are not saved or validated
          if (hasUnsavedChange.current) {
            // schedule closing after saving
            preventedClosing.current = true;
            return;
          }
          preventedClosing.current = false;
        }
        onOpenChange(newOpen);
      }}
      title={
        <DialogTitle
          suffix={
            <DialogTitleActions>
              <Tooltip content="Reset binding" side="bottom">
                {/* automatically close popover when remove expression */}
                <DialogClose>
                  <Button
                    aria-label="Reset binding"
                    prefix={<TrashIcon />}
                    color="ghost"
                    disabled={variant === "default"}
                    onClick={(event) => {
                      event.preventDefault();
                      // inline variables and close dialog
                      const evaluatedValue = evaluateExpressionWithinScope(
                        value,
                        scope
                      );

                      onRemove(evaluatedValue);
                      preventedClosing.current = false;
                      hasUnsavedChange.current = false;
                      onOpenChange(false);
                    }}
                  />
                </DialogClose>
              </Tooltip>
              <DialogClose />
            </DialogTitleActions>
          }
        >
          Binding
        </DialogTitle>
      }
      content={
        <BindingPanel
          scope={scope}
          aliases={aliases}
          valueError={valueError}
          value={value}
          onChange={() => {
            hasUnsavedChange.current = true;
          }}
          onSave={(value, invalid) => {
            // avoid saving without changes
            if (hasUnsavedChange.current === false) {
              return;
            }
            // let user see the error and let close popover after
            hasUnsavedChange.current = false;
            if (invalid) {
              return;
            }
            // save value and close popover
            onChange(value);
            if (preventedClosing.current) {
              preventedClosing.current = false;
              onOpenChange(false);
            }
          }}
        />
      }
    >
      <BindingButton variant={variant} error={valueError} value={value} />
    </FloatingPanel>
  );
};
