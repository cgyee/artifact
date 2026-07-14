import { useState, useEffect, useMemo } from 'react'
import type { Files, Selection, Project } from '../types'
import { debounce } from '../utils/debounce'
import apiFetch from "../utils/apiFetch.ts";

const api = "/api"
const emptyProject: Project = {
    id: "",
    files: {
        "index.html": { content: "" },
        "styles.css": { content: "" },
        "app.js": { content: "" },
    },
}
const maxFileSize = 1024 * 1024 * 2;


async function get(id: string) {
    try {
        const res = await apiFetch(`${api}/project/${id}`, { method: "GET" })
        if (!res.ok) {
            if ((res.status === 401) || res.status === 403) window.location.replace("/dashboard")
            if (res.redirected) {
                window.location.replace("/login")
            }
            return { ...emptyProject, id }
        }
        const project: Project = await res.json()
        return project
    } catch (e) {
        console.error(e)
        return { ...emptyProject, id }
    }
}

async function set(id: string, files: Files) {
    try {
        await apiFetch(`${api}/project/${id}`, {
            method: "POST",
            body: JSON.stringify({ files }),
        })
    } catch (e) {
        console.error(e)
    }
}

export default function useProject(id: string) {
    const [selection, setSelection] = useState<Selection>({ kind: "file", path: "index.html" })
    const [project, setProject] = useState<Project>(emptyProject)

    const onSelect = (s: Selection) => {
        if (s.kind === "dir") {
            s.path = s.path.endsWith("/") ? `${s.path}.keep` : s.path
        }
        setSelection(s)
    }

    const createFile = (name: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files, [name]: { content: "" } },
        }
        setProject(next)
        set(project.id, next.files)
    }

    const createImgFile = async (formData: FormData) => {
        const file = formData.get("imgFile") as File
        const next: Project = {
            ...project,
            files: { ...project.files, [file.name]: { content: "" } },
        }
        if (file.size > maxFileSize) {
            alert("Image is too large")
            return false
        }
        formData.append(
            "imgFile",
            new File([file], file.name, { type: file.type, lastModified: Date.now() }),
        )

        setProject(next)
        try {
            const res = await apiFetch(`${api}/project/${id}/images`, {
                method: "POST",
                body: formData,
            })
            return res.ok
        } catch (e) {
            console.error(e)
            return false
        }
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
        const prefix = oldName.endsWith("/") ? oldName : `${oldName}/`
        const newPrefix = newName.endsWith("/") ? newName : `${newName}/`
        for(const file in project.files) {
            const path = file.slice(0, prefix.length)
            let fileName = file
            if (path === oldName) {
                fileName = file.replace(path, newPrefix)
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
            const path = file.slice(0, name.length)
            if (path !== name) next.files[file] = project.files[file]
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
        setSelection({ kind: "file", path: "index.html" })
    }

    const debouncedSave = useMemo(
         () => debounce(async (p: Project) => {
             await set(id, p.files)

        }, 300),
        [id]
    )

    useEffect(() => {
        (async () => {
            const p = await get(id)
            setProject(p)
        })()
    }, [id])

    return { project, selection, onSelect, debouncedSave, updateContent, renameFile, deleteFile, createFile, createImgFile, renameFolder, deleteFolder }
}
