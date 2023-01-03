export class StyleElement {
  #element?: HTMLStyleElement;
  #name: string;
  constructor(name = "") {
    this.#name = name;
  }
  get isMounted() {
    return this.#element?.parentElement != null;
  }
  mount() {
    if (this.isMounted === false) {
      this.#element = document.createElement("style");
      this.#element.setAttribute("data-webstudio", this.#name);
      document.head.appendChild(this.#element);
    }
  }
  unmount() {
    if (this.isMounted) {
      this.#element?.parentElement?.removeChild(this.#element);
      this.#element = undefined;
    }
  }
  render(cssText: string) {
    if (this.#element) {
      this.#element.textContent = cssText;
    }
  }
}
