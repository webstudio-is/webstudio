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
		const {fontSize, fontFamily, fontWeight, textAlign, paddingLeft, paddingRight} = getComputedStyle(target);
		this.#canvasContext.font = `${fontWeight} ${fontSize} ${fontFamily}`;
		const eventOffset = event.offsetX;
		let charsOffset = 0;
		let pixelPadding = 0
		switch (textAlign) {
			case 'left': {
				pixelPadding += parseFloat(paddingLeft);
				break;
			}
			case 'right': {
				pixelPadding += target.clientWidth - this.#canvasContext.measureText(value).width - parseFloat(paddingRight);
				break;
			}
		}
		let pixelOffset = pixelPadding;
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
		return {valueOffset, valueTokens, charsOffset, pixelOffset, pixelPadding};
	}
	// PUBLIC
	handleEvent(event) {
		const eventTarget = event.target;
		const currentTarget = this.#activeTarget || eventTarget;
		if (currentTarget?.nodeName !== 'INPUT' || currentTarget?.type !== 'text' || currentTarget?.readOnly !== false) return;
		switch (event.type) {
			case 'pointerover': case 'focusin': {
				if (this.#pointerCapture === false) this.#pointerCapture = !this.#passiveEvents.forEach(eventName => this.#ownerDocument.addEventListener(eventName, this, false));
				break;
			}
			case 'pointerout': case 'focusout': {
				if (this.#pointerCapture === true) this.#pointerCapture = !!this.#passiveEvents.forEach(eventName => this.#ownerDocument.removeEventListener(eventName, this, false));
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
						// dismiss if already active
						if (this.#selectTarget) return this.#selectTarget.blur();
						event.preventDefault?.();
						// cache selection state
						let {selectionStart, selectionEnd} = currentTarget;
						let {activeElement} = this.#ownerDocument;
						// get cached measure metrics
						const measureMetrics = currentTarget.props;
						const {valueOffset, valueTokens, pixelOffset} = measureMetrics;
						const activeToken = valueTokens[valueOffset];
						const {tokenValue} = activeToken;
						// create select dropdown
						const selectTarget = this.#selectTarget = this.#ownerDocument.documentElement.appendChild(this.#ownerDocument.createElement('select'));
						// TODO: inline for now
						const unitList = '%,px,em,rem,ch,cm,mm,in,pt,vw,vh,vmin,vmax,svw,svh,lvw,lvh,dvw,dvh'.split(',');
						selectTarget.innerHTML = unitList.map(value => `<option ${tokenValue === value ? 'selected' : ''}>${value}</option>`).join('');
						selectTarget.size = unitList.length;
						// position the dropdown
						const topOffset = currentTarget.offsetTop + currentTarget.clientHeight;
						const leftOffset = currentTarget.offsetLeft + pixelOffset - (selectTarget.clientWidth / 2);
						selectTarget.style.cssText = `position:absolute;top:${topOffset}px;left:${leftOffset}px;min-width:60px;`;
						// attach inline events to select dropdown
						selectTarget.focus();
						selectTarget.onmouseup = () => selectTarget.dataset.selected = true;
						selectTarget.onkeydown = (event) => {
							switch (event.code.toUpperCase()) {
								case 'ENTER': case 'SPACE': case 'ESCAPE': {
									selectTarget.blur();
								}
							}
						};
						selectTarget.onblur = () => {
							this.#selectTarget = selectTarget.remove();
							// restore focus and selection state
							if (activeElement === currentTarget) {
								currentTarget.focus();
								currentTarget.setSelectionRange(selectionStart, selectionEnd);
							}
						};
						// oninput update
						selectTarget.oninput = () => {
							activeToken.tokenValue = selectTarget.options[selectTarget.selectedIndex]?.textContent || activeToken.tokenValue;
							const {selectionStart, selectionEnd, selectionDirection} = currentTarget;
							currentTarget.value = valueTokens.map(({tokenValue}) => tokenValue).join('');
							currentTarget.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
							if (selectTarget.dataset.selected) selectTarget.blur();
						};
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
					switch (activeToken.tokenType) {
						case 'number': {
							if (this.#activeTarget) {
								event.preventDefault?.();
								const {movementY} = event;
								let tokenValue = parseFloat(activeToken.tokenValue) - movementY;
								if (tokenValue % 1 !== 0 || movementY % 1 !== 0) tokenValue = tokenValue.toPrecision(Math.abs(tokenValue).toString().indexOf('.') + 2);
								activeToken.tokenValue = tokenValue;
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
				switch (event.code) {
					case 'ArrowUp': case 'ArrowDown': {
						let {selectionStart, selectionEnd} = currentTarget;
						if (selectionStart > selectionEnd) [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
						const {pixelPadding} = currentTarget.props;
						const currentTargetValue = currentTarget.value;
						const currentSelectionValue = currentTargetValue.substring(currentTarget.selectionStart, currentTarget.selectionEnd);
						let offsetX = this.#canvasContext.measureText(currentTargetValue.substring(0, currentTarget.selectionStart)).width;
						if (pixelPadding) offsetX += pixelPadding;
						if (!isNaN(parseFloat(currentSelectionValue))) offsetX += 0.25;
						let movementY = event.code == 'ArrowUp' ? -1 : 1;
						if (event.shiftKey) movementY *= 10;
						if (event.altKey) movementY *= 0.1;
						this.handleEvent({type: 'pointermove', offsetX, movementY, target: this.#activeTarget = currentTarget, preventDefault: event.preventDefault.bind(event)});
						// if the previous pointermove operation changed the cursor the next pointerdown will have an effect otherwise noop.
						this.handleEvent({type: 'pointerdown', offsetX, movementY, target: currentTarget});
						this.handleEvent({type: 'pointerup', offsetX, movementY, target: currentTarget});
						break;
					}
				}
				break;
			}
		}
	}
	connectedCallback() {
		this.#activeEvents.forEach(eventName => this.#ownerDocument.addEventListener(eventName, this, false));
		return this.disconnectedCallback.bind(this);
	}
	disconnectedCallback() {
		this.handleEvent({type: 'focusout'});
		this.#activeEvents.forEach(eventName => this.#ownerDocument.removeEventListener(eventName, this, false));
	}
}

export const useAutoInputEffect = (useLayoutEffect) => useLayoutEffect(() => new AutoInput().connectedCallback(), []);
