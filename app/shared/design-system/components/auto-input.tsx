export class AutoInput extends EventTarget {
	connectedCallback() {
		this.pointerCapture = false;
		this.eventNames = ['keydown', 'pointerup', 'pointerdown', 'pointerover', 'pointerout'];
		if (!this.activeInput) this.activeInput = null;
		if (!this.canvasContext) Object.getPrototypeOf(this).canvasContext = document?.createElement('canvas')?.getContext('2d');
		for (let name of this.eventNames) globalThis.addEventListener(name, this, false);
		return () => this.disconnectedCallback();
	}
	disconnectedCallback() {
		document.documentElement.style.cursor = '';
		for (let name of this.eventNames) globalThis.removeEventListener(name, this, false);
	}
	measureText(value) {
		return this.canvasContext.measureText(value).width;
	}
	computeFont(input) {
		let {fontSize, fontFamily, fontWeight} = getComputedStyle(input);
		this.canvasContext.font = `${fontWeight} ${fontSize} ${fontFamily}`;
	}
	updateValue(input, value) {
		let {selectionStart, selectionEnd, selectionDirection} = input;
		input.value = value;
		input.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
	}
	measureMove(input, event) {
		let measureMetrics = this.activeInput?.measureMetrics;
		this.computeFont(input);
		let cacheOffset = input.offsetX;
		let eventOffset = cacheOffset == null ? event.offsetX : cacheOffset;
		let charsLength = 0;
		let pixelLength = 0;
		let valueNumber = 0;
		let valueCursor = '';
		let valueTokens = input.value.split(/([+-]?\d*\.?\d+)/g).filter(value => value);
		let valueOffset = -1;
		for (let [tokenIndex, tokenValue] of valueTokens.entries()) {
			charsLength += tokenValue.length;
			let asLength = pixelLength + this.measureText(tokenValue);
			let asNumber = parseFloat(tokenValue.charAt(0) == '.' ? `0.${tokenValue}` : tokenValue);
			let isNumber = !isNaN(asNumber);
			if (measureMetrics?.valueOffset == tokenIndex || (isNumber && eventOffset >= pixelLength && eventOffset <= asLength)) {
				valueOffset = tokenIndex;
				valueNumber = asNumber;
				valueCursor = 'ew-resize';
				break;
			}
			pixelLength = asLength;
		}
		/*
			TODO: should show pointer cursor when mouseover unit, after mousedown in this state should open selectable options as possible units
				<input type=text unit="em,px,...">
		 */
		measureMetrics = {valueNumber, valueCursor, valueOffset, valueTokens, cacheOffset, charsLength, pixelLength};
		input.measureMetrics = measureMetrics;
		return measureMetrics;
	}
	handleEvent(event) {
		let eventTarget = event.target;
		let input = eventTarget?.nodeName === 'INPUT' && eventTarget?.type === 'text' ? eventTarget : this.activeInput;
		if (input?.readOnly !== false) return;
		switch (event.type) {
			case 'pointerdown': {
				if (!(document.documentElement.style.cursor = input.style.cursor)) break;
				this.activeInput = input;
				input.offsetX = event.offsetX;
				break;
			}
			case 'pointerup': {
				if (document.documentElement.style.cursor) document.documentElement.style.cursor = '';
				this.activeInput = null;
				input.offsetX = null;
				input.measureMetrics = null;
				break;
			}
			case 'pointerover': {
				if (this.pointerCapture) break;
				this.pointerCapture = true;
				globalThis.addEventListener('pointermove', this, false);
				break;
			}
			case 'pointerout': {
				if (!this.pointerCapture) break;
				this.pointerCapture = false;
				globalThis.removeEventListener('pointermove', this, false);
				break;
			}
			case 'pointerleave':
			case 'pointermove': {
				let {valueNumber, valueCursor, valueOffset, valueTokens, cacheOffset} = this.measureMove(input, event);
				input.style.cursor = valueCursor;
				if (valueOffset) {
					if (cacheOffset && this.activeInput && ~valueOffset) {
						event.preventDefault();
						valueTokens[valueOffset] = valueNumber + event.movementX;
						this.updateValue(input, valueTokens.join(''));
						if (eventTarget) input.blur();
					}
				}
				break;
			}
			case 'keydown':
				switch (event.key) {
					case 'ArrowUp':
					case 'ArrowDown':
						let {selectionStart, selectionEnd} = input;
						if (selectionStart > selectionEnd) selectionStart = selectionEnd;
						let inputValue = input.value;
						let offsetX = this.measureText(inputValue.substring(0, selectionStart));
						// altKey for decimal steps(event.altKey ? 0.10): but we need to factor into IEEE 754 floating point precision causing leading digits i.e
						// 4.399999999999996 when moving from 4.2 to 4.3
						let movementX = (event.shiftKey ? 10 : 1) * (event.key == 'ArrowUp' ? 1 : -1);
						input.style.cursor = 'ew-resize';
						this.handleEvent({type: 'mousedown', offsetX, target: input});
						this.handleEvent({type: 'mousemove', movementX, preventDefault: () => {
							event.preventDefault();
							while (/[+-.\d]/.test(inputValue[selectionStart - 1])) selectionStart--;
							let selectionEnd = selectionStart;
							while (/[.\d]/.test(inputValue[++selectionEnd]));
							input.setSelectionRange(selectionStart, selectionEnd);
						}});
						this.handleEvent({type: 'mouseup'});
						break;
				}
				break;
		}
	}
	handleList() {
		/*
			TODO: Dropdown
			given a datalist
				<datalist id=#id>
					<option></option>
				<datalist>
			if an input has a datalist id
				<input datalist=#id>
			we activate an autocomplete dropdown on interaction
		*/
	}
}

export function useAutoInputEffect() {
	React.useLayoutEffect(() => new AutoInput().connectedCallback(), []);
}
