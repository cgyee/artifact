import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer.tsx";
import {useParams} from "react-router";
import useProject from "../hooks/useProject";
import LogExplorer from "../components/LogExplorer.tsx";
import {useState} from "react";
import type {LogEntry} from "../types.ts";


export const Edit = () => {
    const projectId = useParams()?.projectId ?? ""
    const { project, selection, onSelect, updateContent, renameFile, deleteFile, createFile, createImgFile, deleteFolder, renameFolder } = useProject(projectId)
    const [logs, setLogs] = useState<LogEntry[]>([])

    const onLogs = (logs: LogEntry[]) => {
        logs.length === 0 ? setLogs([]) : setLogs(prevState => [...prevState, ...logs])
    }
    return (
        <>
            <FileExplorer
                project={project}
                selection={selection}
                onSelection={onSelect}
                renameFile={renameFile}
                deleteFile={deleteFile}
                createFile={createFile}
                deleteFolder={deleteFolder}
                renameFolder={renameFolder}
                createImgFile={createImgFile}
            />
            <Editor
                file={project.files[selection.path]}
                onChange={(content: string) => updateContent(selection.path, content)}
                name={selection.path}
                kind={selection.kind}
                src={`/view/project/${projectId}`}
                resetLogs={() => onLogs([])}
            />
            <LogExplorer logs={logs} onLog={(log) => onLogs([log])} />
        </>

    )
}