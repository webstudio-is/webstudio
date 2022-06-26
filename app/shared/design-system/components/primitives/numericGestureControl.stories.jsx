import {useRef, useEffect} from 'react';
import {numericGestureControl} from './numericGestureControl.js';

const useNumericGestureControl = ({ref, value, direction}) => {
  useEffect(() => {
    const {disconnectedCallback} = numericGestureControl(ref.current, {
      initialValue: ref.current.value = value,
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

export const NumericInput = Object.assign(Input.bind({}), {args: { value: 0, direction: 'horizontal' }});

export default {
  title: 'numericGestureControl',
  component: Input,
  argTypes: {
    value: {
      control: { type: 'number' },
    },
    direction: {
      options: ['horizontal', 'vertical'],
      control: { type: 'radio' },
    },
  },
};
