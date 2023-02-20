import type { StyleElement } from "./style-element";

export class StyleSheet {
  #cssText = "";
  #element;
  constructor(element: StyleElement) {
    this.#element = element;
  }
  replaceSync(cssText: string) {
    if (cssText !== this.#cssText) {
      this.#cssText = cssText;
      this.#element.render(cssText);
    }
  }
}
