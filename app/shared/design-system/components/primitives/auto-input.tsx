export class AutoInput extends EventTarget {
	// PRIVATE
	#selectTarget = null;
	#activeTarget = null;
	#activeEvents = ['keydown', 'focusin', 'focusout', 'pointerover', 'pointerout', 'pointerup', 'pointerdown'];
	#passiveEvents = ['pointermove'];
	#resizeCursor = 'ns-resize';
	#pointerCursor = 'pointer';
	#pointerCapture = false;
	#ownerDocument = globalThis.document;
	#canvasContext = globalThis.document?.createElement('canvas').getContext('2d');
	#typeOfValue(value) {
		if (/^([-+]?\d*\.?\d+)$/.test(value)) return 'number';
		if (/^(%|cm|mm|in|px|pt|pc|em|ex|ch|rem|vw|vh|vmin|vmax|vb|vi|svw|svh|lvw|lvh|dvw|dvh|lh|rlh)$/.test(value)) return 'unit';
		if (/^(\w+)$/.test(value)) return 'keyword';
		if (/^(\w+\()/.test(value)) return 'function';
		return '';
	}
	#measureEvent(value, event, target) {
		const {fontSize, fontFamily, fontWeight} = getComputedStyle(target);
		this.#canvasContext.font = `${fontWeight} ${fontSize} ${fontFamily}`;
		const eventOffset = event.offsetX;
		let charsOffset = 0;
		let pixelOffset = 0;
		let valueOffset = -1;
		const valueTokens = value.split(/([*/,()\s]?)([-+]?\d*\.?\d+)|([*/,()\s]+)/).filter(value => value).map(value => {
			return {tokenType: this.#typeOfValue(value), tokenValue: value}
		});
		for (const [tokenIndex, tokenObject] of valueTokens.entries()) {
			const {tokenValue} = tokenObject;
			const tokenOffset = this.#canvasContext.measureText(tokenValue).width;
			if ((eventOffset >= pixelOffset && eventOffset <= pixelOffset + tokenOffset)) {
				valueOffset = tokenIndex;
				break;
			}
			charsOffset += tokenValue.length;
			pixelOffset += tokenOffset;
		}
		return {valueOffset, valueTokens, charsOffset, pixelOffset};
	}
	// PUBLIC
	handleEvent(event) {
		const eventTarget = event.target;
		const currentTarget = eventTarget?.nodeName === 'INPUT' && eventTarget?.type === 'text' ? eventTarget : this.#activeTarget;
		if (currentTarget?.readOnly !== false) return;
		switch (event.type) {
			case 'pointerover': case 'focusin': {
				if (this.#pointerCapture === false) this.#pointerCapture = !this.#passiveEvents.forEach(eventName => globalThis.addEventListener(eventName, this, false));
				break;
			}
			case 'pointerout': case 'focusout': {
				if (this.#pointerCapture === true) this.#pointerCapture = !!this.#passiveEvents.forEach(eventName => globalThis.removeEventListener(eventName, this, false));
				break;
			}
			case 'pointerdown': {
				this.#activeTarget = currentTarget;
				currentTarget.state = currentTarget.props;
				const currentTargetCursor = currentTarget.style.cursor;
				switch (currentTargetCursor) {
					case this.#resizeCursor: {
						this.#ownerDocument.documentElement.style.cursor = currentTargetCursor;
						break;
					}
					case this.#pointerCursor: {
						event.preventDefault();
						const selectTarget = this.#ownerDocument.documentElement.appendChild(this.#ownerDocument.createElement('select'));
						this.#selectTarget = selectTarget;
						const measureMetrics = currentTarget.props;
						const {valueOffset, valueTokens, pixelOffset} = measureMetrics;
						const activeToken = valueTokens[valueOffset];
						const {tokenValue} = activeToken;
						const unitList = currentTarget.getAttribute('unitlist')?.split(',').map(value => `<option ${tokenValue === value ? 'selected' : ''}>${value}</option>`);
						const topOffset = currentTarget.offsetTop + currentTarget.clientHeight;
						const leftOffset = currentTarget.offsetLeft + pixelOffset + 4;
						selectTarget.style.cssText = `position:fixed;top:${topOffset}px;left:${leftOffset}px;min-width:60px;`;
						selectTarget.innerHTML = unitList.join('');
						selectTarget.size = unitList.length;
						selectTarget.focus();
						selectTarget.onblur = () => this.#selectTarget = selectTarget.remove();
						selectTarget.oninput = () => {
							activeToken.tokenValue = selectTarget.options[selectTarget.selectedIndex]?.textContent || activeToken.tokenValue;
							const {selectionStart, selectionEnd, selectionDirection} = currentTarget;
							currentTarget.value = valueTokens.map(({tokenValue}) => tokenValue).join('');
							currentTarget.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
							selectTarget.blur();
						}
						break;
					}
				}
				break;
			}
			case 'pointerup': {
				this.#ownerDocument.documentElement.style.cursor = '';
				this.#activeTarget = null;
				currentTarget.state = null;
				break;
			}
			case 'pointermove': {
				const measureMetrics = currentTarget.state || this.#measureEvent(currentTarget.value, event, currentTarget);
				currentTarget.props = measureMetrics;
				const {valueOffset, valueTokens} = measureMetrics;
				if (~valueOffset) {
					const activeToken = valueTokens[valueOffset];
					const {tokenValue, tokenType} = activeToken;
					switch (tokenType) {
						case 'number': {
							if (this.#activeTarget) {
								event.preventDefault();
								activeToken.tokenValue = parseFloat(tokenValue) - event.movementY;
								let {selectionStart, selectionEnd} = currentTarget;
								if (selectionStart > selectionEnd) [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
								currentTarget.value = valueTokens.map(({tokenValue}) => tokenValue).join('');
								while (/[+-.\d]/.test(currentTarget.value[selectionStart - 1])) selectionStart--;
								selectionEnd = selectionStart;
								while (/[.\d]/.test(currentTarget.value[++selectionEnd]));
								currentTarget.setSelectionRange(selectionStart, selectionEnd);
							}
							currentTarget.style.cursor = this.#resizeCursor;
							break;
						}
						case 'unit': {
							currentTarget.style.cursor = this.#pointerCursor;
							break;
						}
						default: {
							currentTarget.style.cursor = '';
						}
					}
				}
				break;
			}
			case 'keydown': {
				switch (event.key) {
					case 'ArrowUp': case 'ArrowDown': {
						let {selectionStart, selectionEnd} = currentTarget;
						if (selectionStart > selectionEnd) [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
						const currentTargetValue = currentTarget.value;
						const currentSelectionValue = currentTargetValue.substring(currentTarget.selectionStart, currentTarget.selectionEnd);
						let offsetX = this.#canvasContext.measureText(currentTargetValue.substring(0, currentTarget.selectionStart)).width;
						if (!isNaN(parseFloat(currentSelectionValue))) offsetX += 0.5;
						// altKey for decimal steps(event.altKey ? 0.10): but need to factor IEEE 754 floats causing leading digits i.e 4.39999996
						const movementY = (event.shiftKey ? 10 : 1) * (event.key == 'ArrowUp' ? -1 : 1);
						this.handleEvent({type: 'pointerup'});
						this.handleEvent({type: 'pointerdown', offsetX, movementY, target: currentTarget});
						this.handleEvent({type: 'pointermove', offsetX, movementY, target: currentTarget, preventDefault: () => event.preventDefault()});
						this.handleEvent({type: 'pointerup'});
						break;
					}
				}
				break;
			}
		}
	}
	connectedCallback() {
		this.#activeEvents.forEach(eventName => globalThis.addEventListener(eventName, this, false));
		return this.disconnectedCallback.bind(this);
	}
	disconnectedCallback() {
		this.handleEvent({type: 'focusout'});
		this.#activeEvents.forEach(eventName => globalThis.removeEventListener(eventName, this, false));
	}
}

export const useAutoInputEffect = (useLayoutEffect) => useLayoutEffect(() => new AutoInput().connectedCallback(), []);
