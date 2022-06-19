export class AutoDatalist extends EventTarget {
	// TODO: Dropdown
	// given a datalist
	// 	<datalist id=#id>
	// 		<option></option>
	// 	<datalist>
	// if an input has a datalist id
	// 	<input datalist=#id>
	// we activate an autocomplete dropdown on interaction
	handlEvent(){}
	connectedCallback(){}
	disconnectedCallback(){}
}

export const useAutoDatalistEffect = (useLayoutEffect) => useLayoutEffect(() => new AutoDatalist().connectedCallback(), []);
