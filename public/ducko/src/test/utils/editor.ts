import type { UserEvent } from '@testing-library/user-event'

/**
 * Read the visible text content of the CodeMirror editor inside `container`.
 *
 * CodeMirror renders each line inside its own `.cm-line` block element and
 * doesn't include `\n` characters in the DOM — line breaks are visual only.
 * We iterate the lines and join with newlines so multi-line content round-trips
 * correctly.
 */
export function getEditorText(container: HTMLElement): string {
    const lines = container.querySelectorAll('.cm-content .cm-line')
    if (lines.length === 0) return ''
    return Array.from(lines)
        .map((line) => line.textContent ?? '')
        .join('\n')
}

/**
 * Clear the CodeMirror editor's content by focusing it and firing Ctrl+A / Delete.
 *
 * `user.clear()` doesn't work on contenteditable elements (only inputs/textareas),
 * so we simulate the keyboard shortcut. This is more reliable than trying to
 * dispatch input events directly against CodeMirror's internal state.
 */
export async function clearEditor(user: UserEvent, container: HTMLElement) {
    const cmContent = container.querySelector('.cm-content')
    if (!cmContent) throw new Error('CodeMirror editor not mounted')
    await user.click(cmContent)
    await user.keyboard('{Control>}a{/Control}{Delete}')
}

/**
 * Type text into the CodeMirror editor.
 *
 * We use `user.keyboard()` after focusing rather than `user.type(el, text)`
 * because CodeMirror's contenteditable + basicSetup features (autocomplete,
 * bracket-matching) interact poorly with `user.type`'s synthesized events in
 * jsdom.
 */
export async function typeInEditor(
    user: UserEvent,
    container: HTMLElement,
    text: string,
) {
    const cmContent = container.querySelector('.cm-content')
    if (!cmContent) throw new Error('CodeMirror editor not mounted')
    await user.click(cmContent)
    await user.keyboard(text)
}
