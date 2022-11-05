1. Instance states

   - Hover over an instance, check if its outline is correct
   - Select an instance, check if its outline is correct

1. Create instances by drag&drop

   - Drag a component over an instance - check if its outline is correct
   - Drag a Box over a Box, drop it - check if it was inserted in that Box
   - Drag a Box and place it before a Box - check if it was inserted before
   - Drag a Box and place it after a Box - check if it was inserted after
   - Drag a Box exactly between 2 Boxes - check if it was inserted between
   - Drag a Box to the bottom edge - check if parent Box gets outlined and insertion happened after that dragged over Box inside that outlined parent
   - Drag a Box to the top edge - check if parent Box gets outlined and insertion happened before that dragged over Box inside that outlined parent
   - Create a Box with child Boxes, where children are aligned vertically - repeat the tests above with trying to insert inside the new Box
   - Try to drop into a Paragraph - check that it's not allowed, and it drops next to the Paragraph instead

1. Moving instances on canvas by drag&drop

   - Do the tests described in "Create instances by drag&drop",
     but instead of moving a component from the panel to the canvas,
     move a component that's already on the canvas
   - Create a Paragraph, and make a word in it Bold
     - drag & drop the Bold component - check that entire Paragraph have been moved
   - Try to drop a Box inside itself - check that it's not allowed, and it drops next to it instead
   - Create a Box that contains another Box, give the parent Box a padding
     - drag the parent Box, and try to put it inside the child Box - check that it's not allowed, and it drops next to the parent Box instead

1. Create instance by clicking on a component

   - Make sure no instance is selected (no outline in the canvas)
   - Click on a component in the panel - check that it's inserted at the end of the root instance
   - Select an istance that can accept children (e.g. Box), by clicking on it on the canvas
   - Click on a component in the panel - check that it's inserted at the end of the selected instance
   - Select an instance that cannot accept children (e.g. Heading), but choose one that is not the last child of its parent
   - Click on a component in the panel - check that it's inserted in the parent of the selected instance, and that it's positioned right after the selected instance

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

1. Auth

   - Try to access the dashboard when not logged in to make sure you will be redirected to the login page
   - Open the login page when logged in to make sure you are redirected to the dashboard
   - Ensure you can view a built site in an incognito tab
   - Ensure you can view a forked site in an incognito tab
   - Click on dev login, add the first four characters in AUTH_SECRET value in the `.env` value and make sure user is authenticated and redirected to the dashboard
   - Click on dev login and write a wrong value to make sure you get an error message and stay in the login page.
   - Click on login with GitHub and make sure that you are redirected to the dashboard
   - Click on login with Google and make sure that you are redirected to the dashboard

1. Default properties

   - Add a Box component to the canvas
   - Open Props panel
   - See the default tag is provided and can be modified

1. Asset manager

   - Open assets panel
   - Upload an image
   - Check it loads and shows a progress bar
   - Delete an asset by clicking on the `x` icon and then the delete button in the tooltip

1. Navigator view settings

   - Initially navigator always shown
   - Check that `Menu > View > Undock navigator` is checked
   - Click on "Show navigator"
   - Navigator is now not shown
   - New tab was added that lets you open navigator

1. Navigator keyboard interactions

   - Move focus to the navigator by clicking on a tree item
   - Check that pressing `arrow up` and `arrow down` changes the selected item
   - Check that you can expand and collapse the selected item using `arrow right`, `arrow left`, and `spacebar`
   - Check that pressing `delete` or `backspace` deletes the selected item

1. Navigator drag&drop

   - Drag a tree item and put the cursor between some tree items
     - check that a line appeared between the tree items
     - check that after you drop, the dragged item moves between the tree items
   - Drag a tree item over an empty `Box` item,
     - check that an outline appears around the `Box` item,
     - check that when you drop, the dragged item moves inside the `Box` item
   - Drag a tree item over a non-empty but collapsed `Box` item
     - check that the `Box` item expands automatically when you hold over it
     - check that if you drop before it expands, the dragged item moves inside the `Box`, and becomes the last child
   - Drag a tree item over a `Heading` item, check that it doesn't allow you to drop inside a `Heading`
   - Make some text inside a `Heading` "bold" so that the `Heading` item in the tree gets a child item `Bold Text`
     - check that you cannot drag the `Bold Text` item
   - Start dragging a tree item but do not move the cursor vertically
     - check that by moving horizontally you're able to change how deeply the item is nested inside the tree
   - Drag an item between some tree items
     - check that moving the cursor horizontally allows you to change the depth of the placement indicator line
     - check that after you drop, the dragged item moves to the correct depth
   - Check that after a drag&drop the dragged item is the selected item

1. Flex panel

   - Select an instance
   - Select "flexbox" as the selected display option.
   - Check if clicking a flex property icon opens a dropdown.
   - Check if all flexbox states are computable through the icons seletables.
   - Check if all flexbox states are computable through the grid.
   - Check if gap inputs work.
   - Check if tooltips are present on all icons(including gap input icons).
   - Check that tooltips have a first time interaction delay.

1. Creating a new page

   - Open the pages panel
   - Click on the "New Page" button in the panel header
   - Enter a page name
   - Enter a page path
   - Click on the "Create" button
   - Check than the page is created and selected as the current page
   - Repeat the proccess and make sure it doens't allow you to create a page with an empty name or a path that's used for another page

1. Deleting a page

   - Open the pages panel
   - Make sure you have pages other than the Home page, create one if you don't
   - Click on the menu icon of a page other than the Home page
   - Page settings should open
   - Click on the delete icon in the page settings header
   - Page settings should close
   - Page should disappear from the list
   - If the page was selected, the Home page should become selected instead
   - In the Home page settings, the delete icon should be absent

1. Editing a page

   - Open the pages panel
   - Click on the menu icon of a page
   - Page settings should open
   - Change the page name
   - The name should change in the pages list as well (with a small delay)
   - Change the page path
   - Reload browser tab and open the page settings again and make sure your changes are persisted
