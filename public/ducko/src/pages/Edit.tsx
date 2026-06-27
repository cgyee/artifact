import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer.tsx";
import {useParams} from "react-router";
import useProject from "../hooks/useProject";


export const Edit = () => {

    const projectId = useParams()?.projectId ?? ""
    const { project, selection, onSelect, updateContent, renameFile, deleteFile, createFile, deleteFolder, renameFolder } = useProject(projectId)
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
            />
            <Editor
                file={project.files[selection.path]}
                onChange={(content: string) => updateContent(selection.path, content)}
                name={selection.path}
                kind={selection.kind}
                src={`/api/project/${projectId}`}
            />
        </>

    )
}