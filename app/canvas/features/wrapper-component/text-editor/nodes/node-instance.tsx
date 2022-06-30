import { useUserProps, type Instance, toCss } from "@webstudio-is/sdk";
import { render } from "react-dom";
import { useMemo } from "react";
import { useCss } from "~/canvas/features/wrapper-component/use-css";
import { useBreakpoints } from "~/shared/nano-states";
import { primitives } from "../../../../../shared/canvas-components";
import {
  type EditorConfig,
  type SerializedTextNode,
  TextNode,
} from "../lexical";

type Options = {
  instance: Instance;
  text: string;
  isNew: boolean;
};

export type SerializedInstanceNode = SerializedTextNode & Options;

export class InstanceNode extends TextNode {
  options: Options;

  static getType(): "instance" {
    return "instance";
  }

  static clone(node: InstanceNode) {
    return new InstanceNode(node.options);
  }

  constructor(options: Options) {
    // This makes sure caret is at the end of the selection after inserting this node instance
    super(options.text);
    this.options = options;
  }

  exportJSON(): SerializedInstanceNode {
    const json = super.exportJSON();
    return {
      ...json,
      ...this.options,
      type: InstanceNode.getType(),
    };
  }

  createDOM(config: EditorConfig) {
    const container = super.createDOM(config);
    const element = (
      <InlineWrapperComponent instance={this.options.instance}>
        {this.options.text}
      </InlineWrapperComponent>
    );
    render(element, container);
    return container;
  }

  updateDOM(prevNode: TextNode, dom: HTMLElement, config: EditorConfig) {
    const inner = dom.firstChild as HTMLElement;
    if (inner === null) {
      return true;
    }
    super.updateDOM(prevNode, inner, config);

    return false;
  }

  isInline(): true {
    return true;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }
}

export const $createInstanceNode = (options: Options) => {
  return new InstanceNode(options);
};

// @todo
// - reuse majority of this logic across WrapperComponentDev and WrapperComponent
// - merge className with props
const InlineWrapperComponent = ({
  instance,
  ...rest
}: {
  instance: Instance;
  children: string;
}) => {
  const [breakpoints] = useBreakpoints();
  const css = useMemo(
    () => toCss(instance.cssRules, breakpoints),
    [instance, breakpoints]
  );
  const className = useCss({ instance, css });
  const userProps = useUserProps(instance.id);
  const { Component } = primitives[instance.component];

  return (
    <Component
      {...rest}
      {...userProps}
      key={instance.id}
      id={instance.id}
      className={className}
    />
  );
};
