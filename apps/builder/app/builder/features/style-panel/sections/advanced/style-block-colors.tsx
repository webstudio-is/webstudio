import { createRoot, type Root } from "react-dom/client";
import { syntaxTree } from "@codemirror/language";
import { StateField, type EditorState, type Range } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { parseColor } from "@webstudio-is/css-data";
import {
  toValue,
  type ColorValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { ColorPicker, css, theme } from "@webstudio-is/design-system";

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
};

const mountedSwatches = new WeakMap<HTMLElement, MountedSwatch>();

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
        value={this.color}
        disabled={mounted.view.state.readOnly}
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
    this.render(mounted);
    return true;
  }

  ignoreEvent() {
    return true;
  }

  destroy(element: HTMLElement) {
    const mounted = mountedSwatches.get(element);
    mounted?.root.unmount();
    mountedSwatches.delete(element);
  }
}

export const createColorSwatches = (onComplete: () => void) => {
  const decorate = (state: EditorState) => {
    const widgets: Range<Decoration>[] = [];
    syntaxTree(state).iterate({
      enter(node) {
        if (
          node.name !== "ColorLiteral" &&
          node.name !== "ValueName" &&
          node.name !== "CallExpression"
        ) {
          return;
        }
        let parent = node.node.parent;
        while (parent !== null && parent.name !== "Declaration") {
          parent = parent.parent;
        }
        if (parent === null) {
          return;
        }
        const color = parseColor(state.doc.sliceString(node.from, node.to));
        if (color === undefined) {
          return;
        }
        widgets.push(
          Decoration.widget({
            widget: new ColorSwatch(color, node.from, node.to, onComplete),
            side: -1,
          }).range(node.from)
        );
        return false;
      },
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
