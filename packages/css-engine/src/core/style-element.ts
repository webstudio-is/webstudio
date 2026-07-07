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
  setAttribute(name: string, value: string) {
    if (this.#element) {
      this.#element.setAttribute(name, value);
    }
  }
  getAttribute(name: string) {
    if (this.#element) {
      return this.#element.getAttribute(name);
    }
  }
}

/**
 * A fake style element that does nothing.
 * Useful for testing stylesheets without DOM.
 */
export class FakeStyleElement {
  get isMounted() {
    return false;
  }
  mount() {}
  unmount() {}
  render(_cssText: string) {}
  setAttribute(_name: string, _value: string) {}
  getAttribute(_name: string) {
    return;
  }
}
