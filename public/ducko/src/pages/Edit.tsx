import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer.tsx";
import {useEffect, useMemo, useState} from "react";
import {useParams} from "react-router";

type File = {
    type: string,
    content: string
}
type Files = {
    [key: string]: File
}
type Project = {
    id: string,
    files: Files
}
const api = "/api"
const emptyProject: Project = {id:"", files: {
        "index.html":{type: "html", content: ""},
        "styles.css":{type: "css", content: ""},
        "app.js":{type: "js", content: ""},
    }}

function debounce<A extends unknown[]>(fn: (...args: A) => void, timeout = 300) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: A) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), timeout);
    };
}

async function get(id: string) {
    try {
        const res = await fetch(`${api}/project/${id}`, {
            method: "GET",
        })
        const project: Project | string = await res.json()
        if (!res.ok) return {...emptyProject, id}
        if (typeof project === "string") return {...emptyProject, id}
        return project
    } catch (e) {
        console.error(e)
        return {...emptyProject, id}
    }

}

async function onSave(id: string, files: Files) {
    try {
        await fetch(`${api}/project/${id}`, {
            method: "POST",
            body: JSON.stringify({files: files}),
        })
    } catch (e) {
        console.error(e)
    }
}

export const Edit = () => {
    const projectId = useParams()?.projectId ?? ""
    const [selection, setSelection] = useState<string>("index.html")
    const [project, setProject] = useState<Project>(emptyProject)

    useEffect(() => {
        (async () => {
           const p = await get(projectId)
           setProject(p)
        })()
    }, [projectId]);

    const selectFile = (name: string) => {
        setProject(prev =>
            prev.files[name]
                ? prev
                : { ...prev, files: { ...prev.files, [name]: { type: "html", content: "" } } }
        )
        setSelection(name)
    }

    const updateContent = (name: string, content: string) => {
        const next: Project = {
            ...project,
            files: { ...project.files, [name]: { ...project.files[name], content } }
        }
        setProject(next)
        debouncedSave(next)
    }

    const debouncedSave = useMemo(
        () => debounce((p :Project) => {
            onSave(projectId, p.files)
            console.log("saved")
        }, 300),
        [projectId]
    )

    return (
        <>
            <FileExplorer
                project={project}
                selection={selection}
                setSelection={selectFile}
                onSave={(files) => onSave(projectId, files)}
            />
            <Editor
                file={project.files[selection]}
                onChange={(content: string) => updateContent(selection, content)}
                name={selection}
                src={`/api/project/${projectId}`}
            />
        </>

    )
}

export type {Project, File, Files,}
