import { StyleElement } from "./style-element";

export type CssEngineOptions = {
  name?: string;
  sheet: { cssText: string };
};

export class CssEngine {
  #element;
  #sheet: CssEngineOptions["sheet"];
  constructor({ name, sheet }: CssEngineOptions) {
    this.#element = new StyleElement(name);
    this.#sheet = sheet;
  }
  render() {
    this.#element.mount();
    this.#element.render(this.#sheet.cssText);
  }
  unmount() {
    this.#element.unmount();
  }
  setAttribute(name: string, value: string) {
    this.#element.setAttribute(name, value);
  }
  getAttribute(name: string) {
    return this.#element.getAttribute(name);
  }
}
