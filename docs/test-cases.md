1. Instance states

   - Hover over an instance, check if its outline is correct
   - Select an instance, check if its outline is correct

1. Create instances by drag&drop

   - Drag a component over an instance - check if its outline is correct
   - Drag a box over a box, drop it - check if it was inserted in that box
   - Drag a box and place it before a box - check if it was inserted before
   - Drag a box and place it after a box - check if it was inserted after
   - Select an instance, got to components, click a box - check if it was inserted at the end of the selected instance
   - Drag a box exactly between 2 boxs - check if it was inserted between
   - Drag a box to the bottom edge - check if parent box gets outlined and insertion happened after that dragged over box inside that outlined parent
   - Drag a box to the top edge - check if parent box gets outlined and insertion happened before that dragged over box inside that outlined parent

1. Styles apply

   - Select an instance
   - Change any style
   - See if it is applied

1. Content editable components

   - Add any contenteditable component (heading, paragraph, text ...)
   - Check if you can drag&drop it on the canvas
   - Double click or press enter to enter editing mode
   - Press escape or click away to exit editing mode
   - Selecting with the mouse any char or word shows a menu abov
     e it
   - Selecting with keybord does the same
   - Changing selection using mouse or keyboard moves the menu
   - Menu shows correctly on very left, right, top corners
   - Typing renders typed characters as expected
   - After editing and unfocusing the component content stays the way it was changed
   - After each menu action unfocus component and see that content stays the way it was changed
   - Run every action on first, middle and last word, on first line on second line and on the last line
   - Enter multiline text, unfocus
   - Check every change is also saved when after reloading
   - Enter text and unfocus quickly - changes shouldn't disappear
   - Keep typing text for some time and see in network tab that we send only a few requests, not one for each char

1. Breakpoints

   - Clicking on different breakpoints resizes the canvas
   - Canvas width slider lets you resize canvas only within its bounds
   - Zoom slider works
   - Hovering over breakpoints with the mouse shows the right one in preview
   - Click on Edit breakpoints shows you breakpoints editor
     - lets you change the breakpoint min-width value and it gets applied immediately on the canvas and on the width slider constraint
     - adding a new breakpoint adds it, lets you specify the value, works like every other breakpoint
     - Trash icon button shows confirmation dialog and upon confirmation
       - Delete button deletes the corresponding styles of that breakpoint entirely
       - Abort button doesn't delete and returns you to breakpoints editor
     - Done button returns you to breakpoints selector
   - Click anywhere outside of breakpoints closes breakpoints selector
   - Click on the canvas closes breakpoints selector
   - Styles added on each breakpoint are only applied to each breakpoint, verify that by resizing the canvas in preview mode
   - Resizing canvas width in preview mode doesn't limit resize slider to each breakpoint
