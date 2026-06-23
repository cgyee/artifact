import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { vi } from 'vitest'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

const defaultProject = (id: string) => ({
    id,
    files: {
        'index.html': { type: 'html', content: '<h1>Hello</h1>' },
        'styles.css': { type: 'css', content: 'body{}' },
        'app.js': { type: 'js', content: 'console.log("hi")' },
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
