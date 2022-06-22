import { TextNode } from "lexical";

const typeElementMap = {
  bold: "b",
};

export class InstanceNode extends TextNode {
  static getType() {
    return "instance";
  }

  static clone(node) {
    return new InstanceNode(node.options);
  }

  constructor(options) {
    super(options.text);
    this.options = options;
  }

  createDOM(config) {
    const dom = document.createElement(typeElementMap[this.options.type]);
    const inner = super.createDOM(config);
    inner.className = "instance-inner";
    dom.appendChild(inner);
    return dom;
  }

  updateDOM(prevNode, dom, config) {
    const inner = dom.firstChild;
    if (inner === null) {
      return true;
    }
    super.updateDOM(prevNode, inner, config);
    return false;
  }
}

export function $createInstanceNode(options) {
  return new InstanceNode(options).setMode("token");
}
