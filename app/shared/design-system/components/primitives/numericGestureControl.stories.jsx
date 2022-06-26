import {useRef, useEffect} from 'react';
import {numericGestureControl} from './numericGestureControl.js';

export default { title: 'numericGestureControl' };

const useNumericGestureControl = ({ref, value, direction}) => {
  useEffect(() => {
    const {disconnectedCallback} = numericGestureControl(ref.current, {
      initialValue: value,
      direction: direction,
      onValueChange: (event) => {
        event.preventDefault();
        event.target.value = event.value;
        event.target.select();
      }
    });
    return () => disconnectedCallback();
  }, [direction]);
}

const Input = ({value, direction}) => {
  const ref = useRef();
  useNumericGestureControl({ref, value, direction});
  return <input defaultValue={value} ref={ref} />;
}

export const Horizontal = () => <Input direction="horizontal" value={0} />;
export const Vertical = () => <Input direction="vertical" value={0} />;
