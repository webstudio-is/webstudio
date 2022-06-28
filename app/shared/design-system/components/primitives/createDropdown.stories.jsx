import {useCallback, useEffect} from 'react';
import {createDropdown} from './createDropdown.js';


const Button = ({value, hasField}) => {
  const handleClick = useCallback((event) => {
    createDropdown(event, {
      ...(hasField && {value}),
      items: [
        {value: 'px', selected: true},
        {value: 'cm', selected: false},
        {value: 'em', selected: false},
        {value: 'rem', selected: false},
      ],
    });
  }, []);
  return <button onClick={handleClick}>Create Dropdown</button>;
}

export const Example = Object.assign(Button.bind({}), {args: { value: '', hasField: true }});

export default {
  title: 'createDropdown',
  component: Button,
  argTypes: {
    value: {
      control: { type: 'text' },
    },
    hasField: {
      options: [true, false],
      control: { type: 'radio' },
    },
  },
};
