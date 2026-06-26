import { useState, useEffect, useMemo } from 'react'
import type { Files, Project } from '../types'
import { debounce } from '../util/debounce'

const api = "/api"
const emptyProject: Project = {
    id: "",
    files: {
        "index.html": { content: "" },
        "styles.css": { content: "" },
        "app.js": { content: "" },
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
        setSelection(name)
    }

    const createFile = (name: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files, [name]: { content: "" } },
        }
        setProject(next)
        set(project.id, next.files)
    }

    const createFolder = (name: string) => {
        createFile(`${name}/.keep`)
    }

    const updateContent = (name: string, content: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files, [name]: { ...project.files[name], content } },
        }
        setProject(next)
        debouncedSave(next)
    }
    const renameFolder = (oldName: string, newName: string) => {
        const next: Project = {id: project.id, files: {}}
        for(const file in project.files) {
            const path = file.slice(0, oldName.length)
            let fileName = file
            if (path === oldName) {
                fileName = file.replace(oldName, newName)
            }
            next.files[fileName] = project.files[file]
        }
        set(project.id, next.files)
        setProject(next)
    }

    const renameFile = (oldName: string, newName: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files, [newName]: project.files[oldName] },
        }
        delete next.files[oldName]
        set(project.id, next.files)
        setProject(next)
    }

    const deleteFolder = (name: string) => {
        const next : Project = {id: project.id, files: {}}
        for(const file in project.files) {
            if (!file.includes(name)) {
                next.files[file] = project.files[file]
            }
        }
        set(project.id, next.files)
        setProject(next)
    }

    const deleteFile = (name: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files },
        }
        delete next.files[name]
        setProject(prev => ({
            ...prev,
            files: next.files,
        }))
        set(project.id, next.files)
    }

    const debouncedSave = useMemo(
        () => debounce((p: Project) => {
            set(id, p.files)
        }, 300),
        [id]
    )

    useEffect(() => {
        (async () => {
            const p = await get(id)
            setProject(p)
        })()
    }, [id])

    return { project, selection, selectFile, updateContent, renameFile, deleteFile, createFile, createFolder, renameFolder, deleteFolder }
}
