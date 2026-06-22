import {useParams} from 'react-router'
import {useEffect, useMemo, useState} from "react";

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
        html:{type: "html", content: ""},
        css:{type: "css", content: ""},
        js:{type: "js", content: ""},
    }}
function debounce<A extends unknown[]>(fn: (...args: A) => void, timeout = 300) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: A) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), timeout);
    };
}

async function fetchProject(id: string) {
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

async function saveProject(id: string, files: Files) {
    try {
        await fetch(`${api}/project/${id}`, {
            method: "POST",
            body: JSON.stringify({files: files}),
        })
    } catch (e) {
        console.error(e)
    }
}

const selectionToType = (s: string): "html" | "css" | "js" => {
    const suffix = s.split(".").pop()
    if (suffix === "html") return "html"
    if (suffix === "css") return "css"
    if (suffix === "js") return "js"
    return "html"
}

const Editor = ({selection}: {selection: string}) => {
    const projectId = useParams()?.projectId ?? ""
    const [enabled, setEnabled] = useState<boolean>(false)
    const [editorFiles, setEditorFiles] = useState<Files>(emptyProject.files)
    const [renderToken, setRenderToken] = useState(0);

    const currentType = selectionToType(selection)
    const editor = editorFiles[currentType].content

    const updatePreviewMemo = useMemo(
        () => debounce((files: Files) => {
            // don't really care about the result, just want to update the preview
            saveProject(projectId, files)
            setRenderToken(prev => prev + 1)
        }, 300),
        [projectId]
    )
    const onChange = (content: string) => {
        const file: File = {type: currentType, content}
        const next = {...editorFiles, [currentType]: file}
        setEditorFiles(next)
        if (enabled) updatePreviewMemo(next)
    }

    const handleRefreshClick = () => {
        updatePreviewMemo(editorFiles)
    }
    const handleAutoRefreshClick = () => {
        const next = !enabled
        setEnabled(!next)
        if (!next) updatePreviewMemo(editorFiles)
    }

    useEffect(() => {
        (async () => {
            if (!projectId) return  // guard against empty initial value
            const project = await fetchProject(projectId)
            if (!project.files) return
            const html = project.files.html ?? emptyProject.files.html
            const css = project.files.css ?? emptyProject.files.css
            const js = project.files.js ?? emptyProject.files.js
            setEditorFiles({html, css, js})
        })()
    }, [projectId])

    return (
        <>
            <button onClick={(_) => {
                handleRefreshClick()
            }}>Play</button>
            <button onClick={handleAutoRefreshClick}>Auto Refresh: {enabled ? 'On' : 'Off'}</button>
            <div>{selection}</div>
            <textarea id={"editor"} value={editor} onChange={(e) => onChange(e.target.value)}></textarea>
            <iframe
                title={"preview"}
                id={"preview"}
                src={`${api}/project/${projectId}/render?v=${renderToken}`}
                key={renderToken}
            ></iframe>
        </>
    )
}

export default Editor

