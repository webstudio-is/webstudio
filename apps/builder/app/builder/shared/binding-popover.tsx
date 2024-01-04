import { forwardRef, useMemo, useRef, useState } from "react";
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
  error,
  value,
  onChange,
  onPotentialErrorChange,
  onValidate,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  error: undefined | string;
  value: string;
  onChange: (newValue: string) => void;
  onPotentialErrorChange: (error: string) => void;
  onValidate: () => void;
}) => {
  const [expression, setExpression] = useState(value);
  const usedIdentifiers = useMemo(() => getUsedIdentifiers(value), [value]);

  const updateExpression = (newExpression: string) => {
    setExpression(newExpression);
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
      onChange(newExpression);
    } catch (error) {
      onPotentialErrorChange((error as Error).message);
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
                  setExpression(identifier);
                  onChange(identifier);
                }}
              />
            );
          })}
        </CssValueListArrowFocus>
      </Box>
      <Box css={{ padding: `0 ${theme.spacing[9]} ${theme.spacing[9]}` }}>
        <InputErrorsTooltip errors={error ? [error] : undefined}>
          <div>
            <ExpressionEditor
              scope={scope}
              aliases={aliases}
              autoFocus={true}
              value={expression}
              onChange={updateExpression}
              onBlur={onValidate}
            />
          </div>
        </InputErrorsTooltip>
      </Box>
    </ScrollArea>
  );
};

const BindingButton = forwardRef<HTMLButtonElement>((props, ref) => (
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
        }}
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
));
BindingButton.displayName = "BindingButton";

export const BindingPopover = ({
  scope,
  aliases,
  value,
  onChange,
  onRemove,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  acceptableType?: "text" | "any";
  value: string;
  onChange: (newValue: string) => void;
  onRemove: (evaluatedValue: unknown) => void;
}) => {
  const [open, onOpenChange] = useState(false);
  const [error, setError] = useState<undefined | string>();
  const potentialError = useRef<undefined | string>();

  if (isFeatureEnabled("bindings") === false) {
    return;
  }
  return (
    <FloatingPanelPopover
      modal
      open={open}
      onOpenChange={(newOpen) => {
        if (potentialError.current) {
          setError(potentialError.current);
        } else {
          onOpenChange(newOpen);
        }
      }}
    >
      <FloatingPanelPopoverTrigger asChild>
        <BindingButton />
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent side="top" align="start">
        <BindingPanel
          scope={scope}
          aliases={aliases}
          error={error}
          value={value}
          onChange={(newValue) => {
            potentialError.current = undefined;
            setError(undefined);
            onChange(newValue);
          }}
          onPotentialErrorChange={(error) => {
            potentialError.current = error;
          }}
          onValidate={() => {
            if (potentialError.current) {
              setError(potentialError.current);
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
                  onClick={() => {
                    // reset error, inline variables and close dialog
                    potentialError.current = undefined;
                    setError(undefined);
                    const evaluatedValue = evaluateExpressionWithinScope(
                      value,
                      scope
                    );
                    onRemove(evaluatedValue);
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
