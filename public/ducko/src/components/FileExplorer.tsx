import type {Files, Project} from "../pages/Edit.tsx";

type Props = {
    selection: string,
    setSelection: (file: string) => void
    project: Project
    onSave: (files: Files) => void
}
const FILENAME_REGEX = /^[a-zA-Z0-9-_]+\.(html|css|js)$/

const FileExplorer = ({project, selection, setSelection, onSave }: Props ) => {

    const handleAddOnClick = () => {
        const fileName = window.prompt("Enter file name")
        if (!fileName) return
        if (fileName in project.files) window.alert("File already exists")
        if (!FILENAME_REGEX.test(fileName)) window.alert("Invalid file name")
        onSave({...project.files, [fileName]: {type: "html", content: ""}})
        setSelection(fileName)
    }
    return (
        <div>
            <div>FileExplorer</div>
            <button onClick={handleAddOnClick}>+</button>
            { Object.keys(project.files).map((file) => (
                <button key={file} disabled={file === selection} onClick={() => setSelection(file)}>{file}</button>
            ))}
        </div>
    )
}

export default FileExplorer