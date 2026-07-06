import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// --- jsdom shims for CodeMirror ---
// CodeMirror's view layer calls these on Range for cursor/selection measurement.
// jsdom doesn't implement them, so every keystroke or view update throws
// "textRange(...).getClientRects is not a function". Stub them with zero-rects
// so measurement can no-op cleanly.
if (typeof Range !== 'undefined') {
    if (!Range.prototype.getBoundingClientRect) {
        Range.prototype.getBoundingClientRect = () => ({
            x: 0, y: 0, width: 0, height: 0,
            top: 0, right: 0, bottom: 0, left: 0,
            toJSON: () => ({}),
        })
    }
    if (!Range.prototype.getClientRects) {
        Range.prototype.getClientRects = () =>
            ({
                item: () => null,
                length: 0,
                [Symbol.iterator]: function* () {},
            }) as unknown as DOMRectList
    }
}

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

const defaultProject = (id: string) => ({
    id,
    files: {
        'index.html': { content: '<h1>Hello</h1>' },
        'styles.css': { content: 'body{}' },
        'app.js': { content: 'console.log("hi")' },
    },
})

export const handlers = [
    http.get('/api/project/:id', ({ params }) =>
        HttpResponse.json(defaultProject(params.id as string)),
    ),
    http.post('/api/project/:id', () => HttpResponse.json({ ok: true })),
]

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
