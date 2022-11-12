export class StyleSheet {
  #style?: HTMLStyleElement;
  mount() {
    //if (typeof document === "object" && "adoptedStyleSheets" in document) {
    //  // @ts-expect-error TS2339: Property 'adoptedStyleSheets' does not exist on type 'Document'.
    //  document.adoptedStyleSheets = [this.sheet];
    //  return;
    //}
    if (this.#style === undefined) {
      this.#style = document.createElement("style");
      this.#style.setAttribute("data-webstudio", "");
      document.head.appendChild(this.#style);
    }
  }
  replaceSync(cssText: string) {
    if (this.#style === undefined) {
      throw new Error("StyleSheet not mounted");
    }
    this.#style.textContent = cssText;
  }
}
