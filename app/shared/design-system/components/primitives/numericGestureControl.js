/*
	@example
		numericGestureControl(document.querySelector('input'), {
			onValueChange: (event) => {
				event.preventDefault();
				event.target.value = event.value;
				event.target.select();
			}
		})
*/
export const numericGestureControl = (targetNode, {
	initialValue = 0,
	direction = 'horizontal',
	onValueChange = ({}) => null,
}) => {
	const eventNames = [ 'pointerup', 'pointerdown', 'pointermove' ];
	const state = { type: '', value: initialValue, cursor: direction === 'horizontal' ? 'ew-resize' : 'ns-resize' };
	const handleEvent = ({ type, target, movementY, movementX, pointerId, pressure }) => {
		const movement = direction === 'horizontal' ? movementX : movementY;
		switch (type) {
			case 'pointerup': {
				targetNode.releasePointerCapture(pointerId);
				break;
			}
			case 'pointerdown': {
				targetNode.setPointerCapture(pointerId);
				break;
			}
			case 'pointermove': {
				if (pressure) onValueChange({target, value: state.value += movement, preventDefault: () => event.preventDefault()});
				break;
			}
		}
	};
	targetNode.style.setProperty('cursor', state.cursor);
	eventNames.forEach((eventName) => targetNode.addEventListener(eventName, handleEvent));
	return {
		disconnectedCallback: () => {
			targetNode.style.removeProperty('cursor');
			eventNames.forEach((eventName) => targetNode.removeEventListener(eventName, handleEvent))
		},
	};
};
