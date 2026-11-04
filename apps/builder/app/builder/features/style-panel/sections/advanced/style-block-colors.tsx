import { createRoot, type Root } from "react-dom/client";
import {
  StateEffect,
  StateField,
  type EditorState,
  type Range,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
} from "@codemirror/view";
import { generate, lexer, parse, walk, type CssNode } from "css-tree";
import { parseColor, parseCssVar } from "@webstudio-is/css-data";
import {
  toValue,
  type ColorValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
import {
  ColorPicker,
  ColorThumb,
  css,
  theme,
} from "@webstudio-is/design-system";
import { $cssVarsMap } from "../../shared/model";
import { getMixedStyleGroups } from "./mixed-style-block";

const swatchClass = css({
  display: "inline-flex",
  verticalAlign: "middle",
  marginRight: theme.spacing[2],
});

type MountedSwatch = {
  root: Root;
  view: EditorView;
  from: number;
  to: number;
  widget: ColorSwatch;
  active: boolean;
};

const mountedSwatches = new WeakMap<HTMLElement, MountedSwatch>();
const activeSwatches = new WeakMap<EditorView, MountedSwatch>();

class ColorSwatch extends WidgetType {
  readonly color: ColorValue;
  readonly from: number;
  readonly to: number;
  readonly onComplete: () => void;
  readonly editable: boolean;

  constructor(
    color: ColorValue,
    from: number,
    to: number,
    onComplete: () => void,
    editable: boolean
  ) {
    super();
    this.color = color;
    this.from = from;
    this.to = to;
    this.onComplete = onComplete;
    this.editable = editable;
  }

  eq(other: ColorSwatch) {
    return (
      toValue(this.color) === toValue(other.color) &&
      this.from === other.from &&
      this.to === other.to &&
      this.editable === other.editable
    );
  }

  render(mounted: MountedSwatch) {
    if (!mounted.active) {
      mounted.root.render(
        <ColorThumb
          interactive={this.editable && !mounted.view.state.readOnly}
          color={toValue(this.color)}
          aria-label={toValue(this.color)}
          onClick={() => {
            if (!this.editable || mounted.view.state.readOnly) {
              return;
            }
            const previous = activeSwatches.get(mounted.view);
            if (previous !== undefined && previous !== mounted) {
              previous.active = false;
              previous.widget.render(previous);
            }
            mounted.active = true;
            activeSwatches.set(mounted.view, mounted);
            mounted.widget.render(mounted);
          }}
        />
      );
      return;
    }
    const replace = (value: StyleValue) => {
      const insert = toValue(value);
      const { from, to } = mounted;
      if (mounted.view.state.doc.sliceString(from, to) === insert) {
        return;
      }
      mounted.to = from + insert.length;
      mounted.view.dispatch({ changes: { from, to, insert } });
    };
    mounted.root.render(
      <ColorPicker
        open
        value={this.color}
        disabled={!this.editable || mounted.view.state.readOnly}
        onOpenChange={(open) => {
          if (!open) {
            mounted.active = false;
            if (activeSwatches.get(mounted.view) === mounted) {
              activeSwatches.delete(mounted.view);
            }
            mounted.widget.render(mounted);
          }
        }}
        onChange={(value) => {
          if (value !== undefined) {
            replace(value);
          }
        }}
        onChangeComplete={(value) => {
          replace(value);
          this.onComplete();
        }}
      />
    );
  }

  toDOM(view: EditorView) {
    const element = document.createElement("span");
    element.className = swatchClass();
    const mounted = {
      root: createRoot(element),
      view,
      from: this.from,
      to: this.to,
      widget: this,
      active: false,
    };
    mountedSwatches.set(element, mounted);
    this.render(mounted);
    return element;
  }

  updateDOM(element: HTMLElement, view: EditorView) {
    const mounted = mountedSwatches.get(element);
    if (mounted === undefined) {
      return false;
    }
    mounted.view = view;
    mounted.from = this.from;
    mounted.to = this.to;
    mounted.widget = this;
    this.render(mounted);
    return true;
  }

  ignoreEvent() {
    return true;
  }

  destroy(element: HTMLElement) {
    const mounted = mountedSwatches.get(element);
    if (mounted?.active) {
      activeSwatches.delete(mounted.view);
    }
    mounted?.root.unmount();
    mountedSwatches.delete(element);
  }
}

export const createColorSwatches = (onComplete: () => void) => {
  const variablesChanged = StateEffect.define<null>();
  const decorate = (state: EditorState) => {
    const widgets: Range<Decoration>[] = [];
    const source = state.doc.toString();
    const groups = getMixedStyleGroups(source);
    const localGroup = groups.find((group) => group.source === "local");
    const ast = parse(source, { context: "declarationList", positions: true });
    const variables = new Map($cssVarsMap.get());
    ast.children.forEach((node) => {
      if (node.type === "Declaration" && node.property.startsWith("--")) {
        variables.set(node.property, generate(node.value));
      }
    });
    ast.children.forEach((declaration) => {
      if (declaration.type !== "Declaration") {
        return;
      }
      const value = declaration.value;
      if (value.loc === null) {
        return;
      }
      const valueStart = value.loc.start.offset;
      const valueEnd = value.loc.end.offset;
      const custom = declaration.property.startsWith("--");
      let valueAst = value;
      if (custom) {
        try {
          valueAst = parse(
            source.slice(value.loc.start.offset, value.loc.end.offset),
            { context: "value", positions: true }
          );
        } catch {
          return;
        }
      }
      const offset = custom ? value.loc.start.offset : 0;
      const match = custom
        ? undefined
        : lexer.matchProperty(declaration.property, valueAst);
      const selected: Array<{ from: number; to: number }> = [];
      walk(valueAst, (node: CssNode) => {
        if (node.loc === null) {
          return;
        }
        const from = offset + node.loc.start.offset;
        const to = offset + node.loc.end.offset;
        if (selected.some((range) => range.from <= from && range.to >= to)) {
          return;
        }
        let color = parseColor(source.slice(from, to));
        let isColor = custom || (!match?.error && match?.isType(node, "color"));
        if (
          color === undefined &&
          node.type === "Function" &&
          node.name === "var" &&
          node.children.first?.type === "Identifier"
        ) {
          const reference = parseCssVar(node);
          const resolved =
            variables.get(`--${reference?.value}`) ??
            (reference?.fallback && toValue(reference.fallback));
          if (resolved !== undefined) {
            color = parseColor(resolved);
            if (color !== undefined && !custom) {
              const resolvedFrom = from - valueStart;
              const resolvedValue =
                source.slice(valueStart, from) +
                resolved +
                source.slice(to, valueEnd);
              try {
                const resolvedAst = parse(resolvedValue, {
                  context: "value",
                  positions: true,
                });
                const resolvedMatch = lexer.matchProperty(
                  declaration.property,
                  resolvedAst
                );
                isColor = false;
                if (!resolvedMatch.error) {
                  walk(resolvedAst, (resolvedNode) => {
                    if (
                      resolvedNode.loc?.start.offset === resolvedFrom &&
                      resolvedNode.loc.end.offset ===
                        resolvedFrom + resolved.length &&
                      resolvedMatch.isType(resolvedNode, "color")
                    ) {
                      isColor = true;
                    }
                  });
                }
              } catch {
                isColor = false;
              }
            }
          }
        }
        if (color === undefined || !isColor) {
          return;
        }
        selected.push({ from, to });
        const editable =
          groups.length === 0 ||
          (localGroup !== undefined &&
            from >= localGroup.contentFrom &&
            from < localGroup.to);
        widgets.push(
          Decoration.widget({
            widget: new ColorSwatch(color, from, to, onComplete, editable),
            side: -1,
          }).range(from)
        );
      });
    });
    return Decoration.set(widgets, true);
  };
  const swatches = StateField.define({
    create: decorate,
    update: (widgets, transaction) =>
      transaction.docChanged ||
      transaction.effects.some((effect) => effect.is(variablesChanged))
        ? decorate(transaction.state)
        : widgets,
    provide: (field) => EditorView.decorations.from(field),
  });
  const refreshVariables = ViewPlugin.fromClass(
    class {
      private unsubscribe: () => void;

      constructor(view: EditorView) {
        this.unsubscribe = $cssVarsMap.listen(() => {
          view.dispatch({ effects: variablesChanged.of(null) });
        });
      }

      destroy() {
        this.unsubscribe();
      }
    }
  );
  return [swatches, refreshVariables];
};
