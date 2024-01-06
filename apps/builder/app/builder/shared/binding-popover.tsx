import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { DotIcon, PlusIcon, TrashIcon } from "@webstudio-is/icons";
import {
  Box,
  Button,
  CssValueListArrowFocus,
  CssValueListItem,
  FloatingPanelPopover,
  FloatingPanelPopoverClose,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  InputErrorsTooltip,
  Label,
  ScrollArea,
  SmallIconButton,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { validateExpression } from "@webstudio-is/react-sdk";
import { ExpressionEditor, formatValuePreview } from "./expression-editor";

export const evaluateExpressionWithinScope = (
  expression: string,
  scope: Record<string, unknown>
) => {
  let expressionWithScope = "";
  for (const [name, value] of Object.entries(scope)) {
    expressionWithScope += `const ${name} = ${JSON.stringify(value)};\n`;
  }
  expressionWithScope += `return (${expression})`;
  try {
    const fn = new Function(expressionWithScope);
    return fn();
  } catch {
    //
  }
};

/**
 * execute valid expression without scope
 * to check any variable usage
 */
export const isLiteralExpression = (expression: string) => {
  try {
    const fn = new Function(`return (${expression})`);
    fn();
    return true;
  } catch {
    return false;
  }
};

const getUsedIdentifiers = (expression: string) => {
  const identifiers = new Set<string>();
  // prevent parsing empty expression
  if (expression === "") {
    return identifiers;
  }
  // avoid parsing error
  try {
    validateExpression(expression, {
      transformIdentifier: (identifier) => {
        identifiers.add(identifier);
        return identifier;
      },
    });
  } catch {
    //
  }
  return identifiers;
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
  const [expression, setExpression] = useState(value);
  const usedIdentifiers = useMemo(() => getUsedIdentifiers(value), [value]);
  const [error, setError] = useState<undefined | string>();
  const [touched, setTouched] = useState(false);

  const updateExpression = (newExpression: string) => {
    setExpression(newExpression);
    onChange();
    try {
      if (newExpression.trim().length === 0) {
        throw Error("Cannot use empty expression");
      }
      // update value only when expression is valid
      validateExpression(newExpression, {
        transformIdentifier: (identifier) => {
          if (aliases.has(identifier) === false) {
            throw Error(`Unknown variable "${identifier}"`);
          }
          return identifier;
        },
      });
      setError(undefined);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  return (
    <ScrollArea
      css={{
        display: "flex",
        flexDirection: "column",
        width: theme.spacing[30],
      }}
    >
      <Box css={{ padding: `${theme.spacing[5]} 0` }}>
        <CssValueListArrowFocus>
          {Object.entries(scope).map(([identifier, value], index) => {
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
                  updateExpression(identifier);
                  onSave(identifier, false);
                }}
              />
            );
          })}
        </CssValueListArrowFocus>
      </Box>
      <Box css={{ padding: `0 ${theme.spacing[9]} ${theme.spacing[9]}` }}>
        <InputErrorsTooltip
          errors={
            touched && error ? [error] : valueError ? [valueError] : undefined
          }
        >
          <div>
            <ExpressionEditor
              scope={scope}
              aliases={aliases}
              color={
                error !== undefined || valueError !== undefined
                  ? "error"
                  : undefined
              }
              autoFocus={true}
              value={expression}
              onChange={(value) => {
                updateExpression(value);
                setTouched(false);
              }}
              onBlur={() => {
                onSave(expression, error !== undefined);
                setTouched(true);
              }}
            />
          </div>
        </InputErrorsTooltip>
      </Box>
    </ScrollArea>
  );
};

const BindingButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { error?: string }
>(({ error, ...props }, ref) => {
  const expanded = props["aria-expanded"];
  return (
    // prevent giving content to tooltip when popover is open
    // to avoid button remounting and popover flickering
    // when switch between valid and error value
    <Tooltip content={expanded ? undefined : error} delayDuration={0}>
      <SmallIconButton
        ref={ref}
        css={{
          position: "absolute",
          top: 0,
          left: 0,
          boxSizing: "border-box",
          padding: 2,
          transform: "translate(-50%, -50%) scale(1)",
          transition: "transform 60ms",
          "--dot-display": "block",
          "--plus-display": "none",
          "&:hover, &[aria-expanded=true]": {
            transform: `translate(-50%, -50%) scale(1.5)`,
            "--dot-display": "none",
            "--plus-display": "block",
          },
        }}
        {...props}
        icon={
          <Box
            css={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#834DF4",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              "&[data-variant=error]": {
                backgroundColor: theme.colors.backgroundDestructiveMain,
              },
            }}
            data-variant={error ? "error" : "default"}
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

export const BindingPopover = ({
  scope,
  aliases,
  validate,
  value,
  onChange,
  onRemove,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  validate?: (value: unknown) => undefined | string;
  value: string;
  onChange: (newValue: string) => void;
  onRemove: (evaluatedValue: unknown) => void;
}) => {
  const [open, onOpenChange] = useState(false);
  const hasUnsavedChange = useRef<boolean>(false);
  const preventedClosing = useRef<boolean>(false);

  if (isFeatureEnabled("bindings") === false) {
    return;
  }
  const valueError = validate?.(evaluateExpressionWithinScope(value, scope));
  return (
    <FloatingPanelPopover
      modal
      open={open}
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
    >
      <FloatingPanelPopoverTrigger asChild>
        <BindingButton error={valueError} />
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent side="top" align="start">
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
        {/* put after content to avoid auto focusing heading buttons */}
        <FloatingPanelPopoverTitle
          actions={
            <Tooltip content="Reset binding" side="bottom">
              {/* automatically close popover when remove expression */}
              <FloatingPanelPopoverClose asChild>
                <Button
                  aria-label="Reset binding"
                  prefix={<TrashIcon />}
                  color="ghost"
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
              </FloatingPanelPopoverClose>
            </Tooltip>
          }
        >
          Binding
        </FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
