import { useState, useEffect, useMemo } from 'react'
import type { Files, Project } from '../types'
import { debounce } from '../util/debounce'

const api = "/api"
const emptyProject: Project = {
    id: "",
    files: {
        "index.html": { type: "html", content: "" },
        "styles.css": { type: "css", content: "" },
        "app.js": { type: "js", content: "" },
    },
}

async function get(id: string) {
    try {
        const res = await fetch(`${api}/project/${id}`, { method: "GET" })
        const project: Project | string = await res.json()
        if (!res.ok) return { ...emptyProject, id }
        if (typeof project === "string") return { ...emptyProject, id }
        return project
    } catch (e) {
        console.error(e)
        return { ...emptyProject, id }
    }
}

async function set(id: string, files: Files) {
    try {
        await fetch(`${api}/project/${id}`, {
            method: "POST",
            body: JSON.stringify({ files }),
        })
    } catch (e) {
        console.error(e)
    }
}

export default function useProject(id: string) {
    const [selection, setSelection] = useState<string>("index.html")
    const [project, setProject] = useState<Project>(emptyProject)

    const selectFile = (name: string) => {
        setProject(prev => {
            if (prev.files[name]) return prev
            const next = { ...prev, files: { ...prev.files, [name]: { type: "html", content: "" } } }
            debouncedSave(next)
            return next
        })
        setSelection(name)
    }

    const updateContent = (name: string, content: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files, [name]: { ...project.files[name], content } },
        }
        setProject(next)
        debouncedSave(next)
    }

    const renameFile = (oldName: string, newName: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files, [newName]: project.files[oldName] },
        }
        delete next.files[oldName]
        setProject(next)
        set(project.id, next.files)
    }

    const deleteFile = (name: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files },
        }
        delete next.files[name]
        setProject(next)
        set(project.id, next.files)
    }

    const debouncedSave = useMemo(
        () => debounce((p: Project) => {
            set(id, p.files)
            console.log("saved")
        }, 300),
        [id]
    )

    useEffect(() => {
        (async () => {
            const p = await get(id)
            setProject(p)
        })()
    }, [id])

    return { project, selection, selectFile, updateContent, renameFile, deleteFile }
}
