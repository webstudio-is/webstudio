export class StyleElement {
  #element?: HTMLStyleElement;
  get isMounted() {
    return this.#element?.parentElement != null;
  }
  mount() {
    if (this.isMounted === false) {
      this.#element = document.createElement("style");
      this.#element.setAttribute("data-webstudio", "");
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
