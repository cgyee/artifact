import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { Edit } from './Edit'

type SaveBody = { files: Record<string, { type: string; content: string }> }

function renderEdit(projectId = 'test123') {
    return render(
        <MemoryRouter initialEntries={[`/project/${projectId}`]}>
            <Routes>
                <Route path="/project/:projectId" element={<Edit />} />
            </Routes>
        </MemoryRouter>,
    )
}

describe('Edit', () => {
    it('loads the project and shows the initial file content', async () => {
        renderEdit()
        expect(await screen.findByDisplayValue('<h1>Hello</h1>')).toBeInTheDocument()
    })

    it('switches the editor content when a different file is selected', async () => {
        const user = userEvent.setup()
        renderEdit()
        await screen.findByDisplayValue('<h1>Hello</h1>')

        await user.click(screen.getByRole('button', { name: 'styles.css' }))

        expect(await screen.findByDisplayValue('body{}')).toBeInTheDocument()
    })

    it('collapses a burst of typing into a single debounced save with the final content', async () => {
        const saveBodies: SaveBody[] = []
        server.use(
            http.post('/api/project/:id', async ({ request }) => {
                saveBodies.push((await request.json()) as SaveBody)
                return HttpResponse.json({ ok: true })
            }),
        )

        const user = userEvent.setup()
        renderEdit()
        const editor = await screen.findByDisplayValue('<h1>Hello</h1>')

        await user.clear(editor)
        await user.type(editor, 'abc')

        // Wait past the 300ms debounce window for the save to land.
        await waitFor(() => expect(saveBodies).toHaveLength(1), { timeout: 1000 })

        // Then wait a beat more — regression check for the "new debouncer per
        // keystroke" bug, which produced one save per character. If that bug
        // returns, this assertion fails with length > 1.
        await new Promise((r) => setTimeout(r, 200))
        expect(saveBodies).toHaveLength(1)
        expect(saveBodies[0].files['index.html'].content).toBe('abc')
    })
})

const projectWithCustomFile = (id: string) => ({
    id,
    files: {
        'index.html': { type: 'html', content: '<h1>Hello</h1>' },
        'styles.css': { type: 'css', content: 'body{}' },
        'app.js': { type: 'js', content: 'console.log("hi")' },
        'custom.html': { type: 'html', content: '<p>custom</p>' },
    },
})

describe('Edit — delete file', () => {
    it('removes the file from the explorer and switches selection to index.html', async () => {
        server.use(
            http.get('/api/project/:id', ({ params }) =>
                HttpResponse.json(projectWithCustomFile(params.id as string)),
            ),
        )
        vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

        const user = userEvent.setup()
        renderEdit()

        await user.click(await screen.findByRole('button', { name: 'custom.html' }))
        // selection has switched — editor shows the custom file's content
        await screen.findByDisplayValue('<p>custom</p>')

        await user.click(screen.getByRole('button', { name: '---' }))

        expect(screen.queryByRole('button', { name: 'custom.html' })).not.toBeInTheDocument()
        await waitFor(() =>
            expect(screen.getByRole('textbox')).toHaveValue('<h1>Hello</h1>'),
        )
    })

    it('persists the deletion to the server', async () => {
        const saveBodies: SaveBody[] = []
        server.use(
            http.get('/api/project/:id', ({ params }) =>
                HttpResponse.json(projectWithCustomFile(params.id as string)),
            ),
            http.post('/api/project/:id', async ({ request }) => {
                saveBodies.push((await request.json()) as SaveBody)
                return HttpResponse.json({ ok: true })
            }),
        )
        vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

        const user = userEvent.setup()
        renderEdit()

        await user.click(await screen.findByRole('button', { name: 'custom.html' }))
        await screen.findByDisplayValue('<p>custom</p>')

        await user.click(screen.getByRole('button', { name: '---' }))

        await waitFor(() => expect(saveBodies.length).toBeGreaterThanOrEqual(1), { timeout: 1000 })
        const lastSave = saveBodies[saveBodies.length - 1]
        expect(lastSave.files).not.toHaveProperty('custom.html')
        expect(lastSave.files).toHaveProperty('index.html')
    })
})

describe('Edit — rename file', () => {
    it('replaces the file name in the explorer and preserves the content', async () => {
        server.use(
            http.get('/api/project/:id', ({ params }) =>
                HttpResponse.json(projectWithCustomFile(params.id as string)),
            ),
        )
        vi.stubGlobal('prompt', vi.fn().mockReturnValue('renamed.html'))

        const user = userEvent.setup()
        renderEdit()
        await user.click(await screen.findByRole('button', { name: 'custom.html' }))
        await screen.findByDisplayValue('<p>custom</p>')

        await user.click(screen.getByRole('button', { name: 'Rename' }))

        expect(await screen.findByRole('button', { name: 'renamed.html' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'custom.html' })).not.toBeInTheDocument()
        await waitFor(() =>
            expect(screen.getByRole('textbox')).toHaveValue('<p>custom</p>'),
        )
    })

    it('persists the rename to the server with the original content under the new name', async () => {
        const saveBodies: SaveBody[] = []
        server.use(
            http.get('/api/project/:id', ({ params }) =>
                HttpResponse.json(projectWithCustomFile(params.id as string)),
            ),
            http.post('/api/project/:id', async ({ request }) => {
                saveBodies.push((await request.json()) as SaveBody)
                return HttpResponse.json({ ok: true })
            }),
        )
        vi.stubGlobal('prompt', vi.fn().mockReturnValue('renamed.html'))

        const user = userEvent.setup()
        renderEdit()
        await user.click(await screen.findByRole('button', { name: 'custom.html' }))
        await screen.findByDisplayValue('<p>custom</p>')

        await user.click(screen.getByRole('button', { name: 'Rename' }))

        await waitFor(() => expect(saveBodies.length).toBeGreaterThanOrEqual(1), { timeout: 1000 })
        const lastSave = saveBodies[saveBodies.length - 1]
        expect(lastSave.files).toHaveProperty('renamed.html')
        expect(lastSave.files).not.toHaveProperty('custom.html')
        expect(lastSave.files['renamed.html'].content).toBe('<p>custom</p>')
    })
})
