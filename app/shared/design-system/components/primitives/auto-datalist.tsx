export class AutoDatalist extends EventTarget {
	// @todo: Dropdown
	// given a datalist
	// 	<datalist id=#id>
	// 		<option></option>
	// 	<datalist>
	// if an input has a datalist id
	// 	<input datalist=#id>
	// we activate an autocomplete dropdown on interaction
	handlEvent() {
		return;
	}
	connectedCallback() {
		return;
	}
	disconnectedCallback() {
		return;
	}
}

export const useAutoDatalistEffect = (useLayoutEffect) => useLayoutEffect(() => new AutoDatalist().connectedCallback(), []);
