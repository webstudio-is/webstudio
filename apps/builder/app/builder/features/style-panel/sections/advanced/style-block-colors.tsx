import { createRoot, type Root } from "react-dom/client";
import { StateField, type EditorState, type Range } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { lexer, parse, walk, type CssNode } from "css-tree";
import { parseColor } from "@webstudio-is/css-data";
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

  constructor(
    color: ColorValue,
    from: number,
    to: number,
    onComplete: () => void
  ) {
    super();
    this.color = color;
    this.from = from;
    this.to = to;
    this.onComplete = onComplete;
  }

  eq(other: ColorSwatch) {
    return (
      toValue(this.color) === toValue(other.color) &&
      this.from === other.from &&
      this.to === other.to
    );
  }

  render(mounted: MountedSwatch) {
    if (!mounted.active) {
      mounted.root.render(
        <ColorThumb
          interactive={!mounted.view.state.readOnly}
          color={toValue(this.color)}
          aria-label={toValue(this.color)}
          onClick={() => {
            if (mounted.view.state.readOnly) {
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
        disabled={mounted.view.state.readOnly}
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
  const decorate = (state: EditorState) => {
    const widgets: Range<Decoration>[] = [];
    const source = state.doc.toString();
    const ast = parse(source, { context: "declarationList", positions: true });
    ast.children.forEach((declaration) => {
      if (declaration.type !== "Declaration") {
        return;
      }
      const value = declaration.value;
      if (value.loc === null) {
        return;
      }
      const custom = declaration.property.startsWith("--");
      const valueAst = custom
        ? parse(source.slice(value.loc.start.offset, value.loc.end.offset), {
            context: "value",
            positions: true,
          })
        : value;
      const offset = custom ? value.loc.start.offset : 0;
      const match = custom
        ? undefined
        : lexer.matchProperty(declaration.property, valueAst);
      if (!custom && match?.error) {
        return;
      }
      const selected: Array<{ from: number; to: number }> = [];
      walk(valueAst, (node: CssNode) => {
        if (node.loc === null || (!custom && !match?.isType(node, "color"))) {
          return;
        }
        const from = offset + node.loc.start.offset;
        const to = offset + node.loc.end.offset;
        if (selected.some((range) => range.from <= from && range.to >= to)) {
          return;
        }
        const color = parseColor(source.slice(from, to));
        if (color === undefined) {
          return;
        }
        selected.push({ from, to });
        widgets.push(
          Decoration.widget({
            widget: new ColorSwatch(color, from, to, onComplete),
            side: -1,
          }).range(from)
        );
      });
    });
    return Decoration.set(widgets, true);
  };
  return StateField.define({
    create: decorate,
    update: (widgets, transaction) =>
      transaction.docChanged ? decorate(transaction.state) : widgets,
    provide: (field) => EditorView.decorations.from(field),
  });
};
