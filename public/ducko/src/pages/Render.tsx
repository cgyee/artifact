import {useParams} from "react-router";
import {useEffect, useState} from "react";
// import { Interweave } from "interweave";

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

async function fetchProject(id: string) {
    const emptyProject = {id, files: {html: {type: "html", content: ""}, css: {type: "css", content: ""}}}
    try {
        const res = await fetch(`${api}/project/${id}`, {
            method: "GET",
        })
        const project: Project = await res.json()
        console.log(project)
        if (!project?.files) return emptyProject
        return project
    } catch (e) {
        console.error(e)
        return emptyProject
    }
}

const Render = () => {
    const projectId = useParams()?.projectId ?? ""
    // const [previewFiles, setPreviewFiles] = useState<Files>({html: {type: "html", content: ""}, css: {type: "css", content: ""}})
    const [previewFiles, setPreviewFiles] = useState<string>("")


    useEffect(() => {
        (async () => {
            const project = await fetchProject(projectId)
            if (!project.files) return
            const html = project.files.html?.content ?? ""
            const css = project.files.css?.content ?? ""
            const style = `<style>${css}</style>`
            const htmlWithStyle = `<!doctype html><html><head>${style}</head><body>${html}</body></html>`
            setPreviewFiles(htmlWithStyle)
        })()
    }, [projectId])
    return (
        <>
            <div>Render</div>
            <div dangerouslySetInnerHTML={{__html: previewFiles}}></div>
        </>
    )


}

export default Render