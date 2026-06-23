import type {Project} from "../types";

type Props = {
    selection: string,
    setSelection: (file: string) => void
    project: Project
    renameFile: (oldName: string, newname: string) => void
    deleteFile: (name: string) => void
}
const FILENAME_REGEX = /^[a-zA-Z0-9-_]+\.(html|css|js)$/



const FileExplorer = ({project, selection, setSelection, renameFile, deleteFile }: Props ) => {

    const fileNameValid = (fileName: string) => {
        if (fileName in project.files) {
            window.alert("File already exists")
            return false
        }
        if (!FILENAME_REGEX.test(fileName)) {
            window.alert("Invalid file name")
            return false
        }
        return true
    }

    const handleAddOnClick = () => {
        const fileName = window.prompt("Enter file name")
        if (!fileName) return
        if (!fileNameValid(fileName)) return
        setSelection(fileName)
    }

    const handleRenameOnClick = () => {
        const newName = window.prompt("Enter new file name")
        if (!newName) return
        if (["index.html", "styles.css", "app.js"].includes(selection)) {
            window.alert("Cannot rename default files")
            return
        }
        if (!fileNameValid(newName)) return
        renameFile(selection, newName)
        setSelection(newName)
    }

    const handleDeleteOnClick = () => {
        const conf = window.confirm("Are you sure you want to delete this file?")
        if (!conf) return
        if (["index.html", "styles.css", "app.js"].includes(selection)) {
            window.alert("Cannot delete default files")
            return
        }
        deleteFile(selection)
        setSelection("index.html")
    }
    return (
        <div>
            <div>FileExplorer</div>
            <button onClick={handleAddOnClick}>+</button>
            <button onClick={handleRenameOnClick}>Rename</button>
            <button onClick={handleDeleteOnClick}>---</button>
            { Object.keys(project.files).map((file) => (
                <button key={file} disabled={file === selection} onClick={() => setSelection(file)}>{file}</button>
            ))}
        </div>
    )
}

export default FileExplorer