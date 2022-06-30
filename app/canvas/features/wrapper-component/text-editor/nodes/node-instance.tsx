import { render } from "react-dom";
import { type Instance } from "@webstudio-is/sdk";
import {
  type EditorConfig,
  type SerializedTextNode,
  TextNode,
} from "../lexical";
import { InlineWrapperComponentDev } from "../../wrapper-component";

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
      <InlineWrapperComponentDev instance={this.options.instance}>
        {this.options.text}
      </InlineWrapperComponentDev>
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
