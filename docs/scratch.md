# Walking Skeletons & Elephant Carpaccios

Working notes for incremental development of the Glitch clone. Each *walking skeleton* defines the smallest end-to-end thing the system can do at a given milestone. Each *elephant carpaccio* slices that milestone into the thinnest vertical demoable increments.

---

## Skeleton #1: Edit, preview, share

> A user visits my site, sees an editable HTML document and a preview pane, clicks 'Run' to render their edits, and can send a URL to a friend who opens the same project and sees the same rendered page.

### Carpaccio Attempt #4 (final)

1. Landing Page (`/`).
2. Auto-generate `projectId` and redirect to `/project/:projectId/edit`.
3. HTML Editor Panel — display only, no editing.
4. Add user input capabilities to the editor — typing like a textarea.
5. Add retention to the editor — content persists across reloads via MongoDB on debounced change (~2s). Keyed by project ID, with a files collection. On page load, the editor reads the matching project from the database.
6. Add Render button to the HTML Editor Panel. The backend retrieves HTML content from MongoDB and returns it; the preview panel displays it via an iframe.

### Addendums

- **Slice 3(a):** A framework for onchange event handling would make this a lot easier. Currently handling it manually via a script tag with an event listener on the textarea.
- **Slice 3(b):** The endpoint to return a static HTML file can't also return JSON (not easily, without hackery).

---

## Skeleton #2: HTML + CSS with proper asset resolution

> User editing a project sees an HTML file and a CSS file, and when the HTML references the CSS file via `<link>`, the rendered preview correctly applies the CSS.

### Carpaccio Attempt #1

1. Add 'File Selection' panel — display only, no functionality, shows HTML and CSS file selections (hardcoded).
2. Add onclick to HTML file to show it in the editor panel.
3. Add onclick to CSS file to show it in the editor panel.
4. Add persistence to the HTML editor panel — retains content across "clicks" from file selection panel.
5. Add user input capabilities for the CSS editor panel — typing like a textarea.
6. Add retention to the CSS editor panel — persists across reloads via MongoDB on debounced change (~2s), keyed by project ID with `css` as the property name.
7. Add persistence to the CSS editor panel — retains content across "clicks" from file selection panel.
8. The render button should render the CSS file in the preview panel. The backend retrieves CSS from MongoDB and returns it. Probably using the postMessage API?
9. Refactor the editor panel to differentiate HTML/CSS files (showing the current active file), and save as `project.files.html` or `project.files.css`?

### Carpaccio Attempt #2

1. Add 'File Selection' panel — display only, no functionality, hardcoded HTML and CSS selections.
2. Add selection to the panel; refactor the editor panel to differentiate HTML/CSS files.
3. The render button should render the applied CSS file in the preview panel.
4. The shared page (`/project/{projectId}/render`) should render the HTML file with the applied CSS. Create a `/project/{projectId}/file/{fileName}` endpoint to serve files, served at `/project/{projectId}/render`.

### Carpaccio Attempt #3

1. Add 'File Selection' panel — display only, no functionality, hardcoded HTML and CSS selections.
2. Add selection to the panel; refactor editor to differentiate HTML/CSS (CSS saved as `project.css`?).
3. Refactor the application to save content as `project.files.html` or `project.files.css`.
4. Wire the render button to show the applied CSS file in the preview panel.
5. The shared page (`/project/{projectId}/render`) should render the HTML and applied CSS. Create a new `/project/{projectId}/{fileName}` endpoint to serve the files.

### Carpaccio Attempt #4 (final)

1. File selection panel — display only, hardcoded items.
2. Schema migration — `project.html` becomes `project.files['index.html']`. Existing editor still works. (Invisible plumbing slice.)
3. Clicking a file in the panel switches the editor content. CSS file edits save to `project.files['style.css']`.
4. Add `GET /project/:id/:filename` endpoint. Demo: hit it directly, see file contents.
5. Render endpoint's HTML includes `<link href="style.css">`. Browser fetches CSS via the slice 4 endpoint. Preview shows styled output.

### Learnings

- `index.html` became `html` and `style.css` became `css` in the requests, responses, and database.
- Can't use `srcDoc` as relative paths don't work — that wouldn't let us apply the CSS file similar to a real world scenario.
- Grouping state into a single object seems to be a good idea in this case — no need to juggle state between HTML and CSS edits in the editor panel.
- We can use the same endpoint for both HTML and CSS files. Also, website `hrefs` are relative to the URL path you are currently on.
- Backend will need to be refactored soonish since it's not very clean. A lot of repetition and coupling. Will introduce a lot of bugs. Will add tests → refactor → start TDD going forward.
- I have broken the render page. Since React Router uses client-side routing, I need to figure out how to render the HTML and CSS files without using an iframe.
  - The solution was to reuse the `/project/:id` endpoint and use `dangerouslySetInnerHTML` to render the HTML and CSS files. The CSS files are applied via a `<style>` tag in the HTML since `dangerouslySetInnerHTML` doesn't fetch the CSS files.

---

## Skeleton #3: JS execution

> JS executes in the preview on load.

### Carpaccio Attempt (final)

1. Refactor the frontend `Project` type to include a `js` property.
2. Add a JavaScript selection to the file explorer. Skeleton #2 slices 1 (file selection panel) and 3 (file explorer switching) should take care of the editor panel — just need to add the JS file selection.
3. I write `<script src="app.js"></script>` in `index.html`, `alert('hello')` in `app.js`, click Play, see the alert.

---

## Skeleton #4: File CRUD *(planned)*

> A user can create a new file with a name they choose, rename an existing file, and delete a file — via the file explorer.

### Carpaccio Attempt #1

0. *(refactor, invisible to user)* Storage migrates from type-key (`files["html"]`) to filename-key (`files["index.html"]`). Editor's read/write logic and any backend lookups switch to the filename convention. No user-visible change — demo is "everything still works after migration."
1. *(refactor, invisible to user)* Add patch to the `/project/:id` endpoint to accept old filename and new filename content.
2. Create a 'File Input' modal with 'Accept/Enter' and 'Cancel'. (Probably needs a better name.)
3. Input modal should prompt the user for a filename + extension.
4. Add input validation: no spaces, no leading/trailing slashes, no double periods, only allowed extensions (`.html`, `.css`, `.js`), etc. Filenames should be unique to their extension. File saved to the database as `project.files[filename]`.
5. Input modal should POST/PUT the current file(s) to the database.
6. Add a new file button (+) to the file explorer.
7. Wire the new file button to the input modal.
8. Add a rename file button (pencil) to the file explorer.
9. Wire the rename file button to the input modal.
10. Add a delete file button (trash) to the file explorer.
11. Add functionality to the delete file button. No confirmation needed.

### Carpaccio Attempt #2

0. *(refactor, invisible to user)* Storage migrates from type-key (`files["html"]`) to filename-key (`files["index.html"]`). Editor's read/write logic and any backend lookups all switch to the filename convention. No user-visible change. File explorer must also read files from the project, not hardcoded values.
1. Create a `+` button in the file explorer; clicking → `window.prompt("filename")` → file added to the project's files map with empty content. File appears in the file explorer, user can select and edit it.
2. Add input validation: no spaces, no leading/trailing slashes, no double periods, only allowed extensions (`.html`, `.css`, `.js`), etc. Filenames unique to their extension. File saved as `project.files[filename]`. Typing an invalid name displays an error.
3. Rename — click the 'Rename' button → `window.prompt("new filename")` → file renamed in the project's files map. If the renamed file was selected, selection follows the rename. Probably prevent renaming 'core' files like `index.html`, `style.css`, `app.js` (they're the simple entry points for preview rendering).
4. Delete — click the 'Delete' button → `window.confirm("Are you sure you want to delete this file?")` → file deleted from the project's files map. If a currently selected file was deleted, show an empty editor. Probably prevent deleting 'core' files like `index.html`, `style.css`, `app.js`.

#### Learnings ####
Need refactoring Editor and File Explorer components to use shared state since they are now coupled. The File Explorer can create, rename, and delete files and the Editor needs to be able to reflect those changes. Espcially since they're hitting the same endpoints.
useEffects run after the paint cycle