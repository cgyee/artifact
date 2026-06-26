import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer.tsx";
import {useParams} from "react-router";
import useProject from "../hooks/useProject";


export const Edit = () => {

    const projectId = useParams()?.projectId ?? ""
    const { project, selection, selectFile, updateContent, renameFile, deleteFile, createFile, deleteFolder, renameFolder } = useProject(projectId)
    return (
        <>
            <FileExplorer
                project={project}
                selection={selection}
                onSelection={selectFile}
                renameFile={renameFile}
                deleteFile={deleteFile}
                createFile={createFile}
                deleteFolder={deleteFolder}
                renameFolder={renameFolder}
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