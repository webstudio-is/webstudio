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
 * document.querySelector('button').addEventListener('click', (event) => {
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
 * @todo api to recieve the resolved value
 * @todo convert to react component
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
    const field = (this.innerHTML = `
		<dialog>
			${
        this.hasAttribute("value")
          ? `<fieldset><input autofocus placeholder="enter a value" value="${this.getAttribute(
              "value"
            )}"></fieldset>`
          : ""
      }
			<form method="dialog">
				<fieldset style="display:flex;flex-direction:column;">
					<select  size="${Math.min(10, this.children.length)}">
						${[...this.querySelectorAll("option")]
              .map((option) => option.outerHTML)
              .join("")}
					</select>
				</fieldset>
			</form>
		</dialog>
		`);
    const dialogNode = this.querySelector("dialog");
    const searchNode = this.querySelector("input");
    const selectNode = this.querySelector("select");
    Object.assign(this, {
      dialogNode,
      searchNode,
      selectNode,
      once: false,
      tabIndex: 0,
    });
    ["close", "keydown", "pointerdown", "focusout"].forEach((eventName) =>
      this.addEventListener(eventName, this)
    );
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
        if (event.code === "Escape") return dialogNode.close();
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
      case "focusout": {
        if (this.contains(event.relatedTarget)) break;
        dialogNode.close();
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
  { value, items = [], className = "", style = {} }
) => {
  // create
  const targetNode = new Range().createContextualFragment(`
		<drop-down ${
      value == null ? `` : `value="${value}"`
    } class="${className}" style="position:absolute;left:${clientX}px;top:${clientY}px;">
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
