import {useParams} from 'react-router'
import {useEffect, useMemo, useState} from "react";

type File = {
    type: string,
    content: string
}
type Files = {
    html: File,
    css: File
}
type Project = {
    id: string,
    files: Files
}
const api = "http://localhost:8080"

// Stable shell loaded once into the iframe. It listens for postMessage and
// swaps body content without reloading the document — avoiding the srcdoc flash.
// Caveat: <script> tags injected via innerHTML do not execute.
// const PREVIEW_SHELL = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;height:100%}</style></head><body id="root"></body><script>window.addEventListener('message',(e)=>{document.getElementById('root').innerHTML=e.data;});</script></html>`

function debounce<A extends unknown[]>(fn: (...args: A) => void, timeout = 300) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: A) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), timeout);
    };
}

async function fetchProject(id: string) {
    const emptyProject: Project = {id, files: {
            html:{type: "html", content: ""},
            css:{type: "css", content: ""},
    }}
    try {
        const res = await fetch(`${api}/project/${id}`, {
            method: "GET",
        })
        const project: Project = await res.json()
        console.info("project: ", project)
        if (!project?.files) return emptyProject

        return project
    } catch (e) {
        console.error(e)
        return emptyProject
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

const selectionToType = (s: string): "html" | "css" =>
    s === "style.css" ? "css" : "html"

const Editor = ({selection}: {selection: string}) => {
    const projectId = useParams()?.projectId ?? ""
    const [enabled, setEnabled] = useState<boolean>(false)
    const [editorFiles, setEditorFiles] = useState<Files>({html: {type: "html", content: ""}, css: {type: "css", content: ""}})
    const [renderToken, setRenderToken] = useState(0);

    const currentType = selectionToType(selection)
    const editor = editorFiles[currentType].content

    const updatePreviewMemo = useMemo(
        () => debounce((files: Files) => {
            saveProject(projectId, files)
            // updatePreviewDom(files[currentType].content)
        }, 300),
        [projectId]
    )
    const onChange = (content: string) => {
        const file: File = {type: currentType, content}
        setEditorFiles(prev => ({...prev, [currentType]: file}))
        enabled && updatePreviewMemo(editorFiles)
    }

    const handleRefreshClick = () => {
        updatePreviewMemo(editorFiles)
    }
    const handleAutoRefreshClick = () => {
        setEnabled(!enabled)
    }

    useEffect(() => {
        (async () => {
            const project = await fetchProject(projectId)
            if (!project.files) return
            const html = project.files.html ?? {type: "html", content: ""}
            const css = project.files.css ?? {type: "css", content: ""}
            setEditorFiles({html, css})
            // updatePreviewDom(html.content)
        })()
    }, [projectId])

    return (
        <>
            <button onClick={(_) => {
                setRenderToken(prev => prev + 1)
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
                // onLoad={() => updatePreviewDom(editorFiles.html.content)}
            ></iframe>
        </>
    )
}

export default Editor