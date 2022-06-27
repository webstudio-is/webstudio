/**
 * @description
 * - creates an agnostic dropdown menu
 * - features a text field and select list
 * - selecting a value from the select list updates the textfield
 * - pressing "Escape" destroys the dropdown
 * - clicking outside the dropdown container destroys the dropdown
 * - using keyboard up/down keys navigates the list while focused
 * - when navigating the list with arrow keys repeats from the start/end as per the last navigation point
 * @example
 * document.querySelector('button').addEventListener('pointerup', (event) => {
 * 	 createDropdown(event, {
 * 	   items: [
 * 		   {value: 'px', selected: true},
 * 		   {value: 'cm', selected: false},
 * 		   {value: 'em', selected: false},
 * 		   {value: 'rem', selected: false},
 * 	   ],
 *   });
 * })
 * @todo calculate if clientX + clientWidth is greater than viewport clientWidth and adjust as needed
 * @todo stories file
 * @todo api to recieve the resolved value
 * @todo make the text field an optional feature, some dropdowns won't need it.
 */
class Dropdown extends HTMLElement {
  connectedCallback() {
    const impostor = document.querySelector(this.localName);
    // there can only be one
    if (impostor !== null && impostor !== this) impostor?.remove();
    // immediately
    this.dialogNode.show();
    // focus select
    this.selectNode.focus();
  }
  constructor() {
    super();
    this.innerHTML = `
		<dialog>
			<form method="dialog">
				<fieldset>
					<input autofocus placeholder="enter a value" value="${
            this.querySelector("option[selected]")?.value || ""
          }">
				</fieldset>
				<fieldset style="display:flex;flex-direction:column;">
					<select  size="${Math.min(10, this.children.length)}">
						${[...this.querySelectorAll("option")]
              .map((option) => option.outerHTML)
              .join("")}
					</select>
				</fieldset>
			</form>
		</dialog>
		`;
    const dialogNode = this.querySelector("dialog");
    const searchNode = this.querySelector("input");
    const selectNode = this.querySelector("select");
    const eventNames = ["close", "keydown", "pointerdown", "pointerout"];
    eventNames.forEach((eventName) => this.addEventListener(eventName, this));
    Object.assign(this, { dialogNode, searchNode, selectNode, once: false });
  }
  handleEvent(event) {
    const { dialogNode, searchNode, selectNode } = this;
    const selectValue = selectNode.value;
    switch (event.type) {
      case "close": {
        this.remove();
        break;
      }
      case "keydown": {
        // avoid text input sourced keyboard events
        if (event.target === searchNode) break;
        if (["ArrowUp", "ArrowDown"].includes(event.code)) {
          // up/down continue and repeat from the opposite-end when the end is reach
          let { selectedIndex } = selectNode;
          const optionsArray = [...selectNode.options];
          const optionsLength = optionsArray.length;
          switch (event.code) {
            case "ArrowUp": {
              if (selectedIndex-- < 1) selectedIndex = optionsLength - 1;
              break;
            }
            case "ArrowDown": {
              if (selectedIndex++ === optionsLength - 1) selectedIndex = 0;
              break;
            }
          }
          if (selectedIndex === selectNode.selectedIndex) break;
          selectNode.selectedIndex = selectedIndex;
          event.preventDefault();
        }
        break;
      }
      case "pointerdown": {
        if (event.target.nodeName === "OPTION") event.target.selected = true;
        break;
      }
      case "pointerout": {
        // when leaving the dropdown viewport, "once" event listener that removes itself
        // when activate outside of the dropdown.
        if (
          this.once ||
          event.target !== dialogNode ||
          this.contains(event.relatedTarget)
        )
          break;
        globalThis.addEventListener(
          "pointerdown",
          (this.handlePointerDown = (event) => {
            // come from a focus change from outside of the browser window
            // if coming back to the same dropdown, don't close.
            if (!this.contains(event.target)) dialogNode.close();
          }),
          { once: (this.once = true) }
        );
        break;
      }
    }
    // if the selected value has changed update, text input
    if (selectValue !== selectNode.value) searchNode.value = selectNode.value;
  }
}
customElements.get("drop-down") || customElements.define("drop-down", Dropdown);

export const createDropdown = (
  { clientX, clientY },
  { items = [], className = "", style = {} }
) => {
  // create
  const targetNode = new Range().createContextualFragment(`
		<drop-down class="${className}" style="position:absolute;left:${clientX}px;top:${clientY}px;">
			${items
        .map(
          ({ value, selected }) =>
            `<option ${selected ? "selected" : ""}>${value}</option>`
        )
        .join("")}
		</drop-down>
	`).firstElementChild;
  // inline style if any
  Object.assign(targetNode.style, style);
  // connect to document
  document.documentElement.append(targetNode);

  return {
    disconnectedCallback: () => {
      targetNode.remove();
    },
  };
};
