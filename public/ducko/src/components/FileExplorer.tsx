import type {Files, Project, TreeNode} from "../types";
import TreeView from "./TreeView.tsx";

type Props = {
    selection: string,
    setSelection: (file: string) => void
    project: Project
    renameFile: (oldName: string, newname: string) => void
    deleteFile: (name: string) => void
}
const FILENAME_REGEX = /^[a-zA-Z0-9-_]+\.(html|css|js)$/


const buildDirTree = (files: Files) => {
    const root: TreeNode = {type: "dir", children: {}}
    for (const path of Object.keys(files)) {
        const seg = path.split("/")
        let node = root
        for (let i = 0; i < seg.length - 1; i++) {
              // If the current directory doesn't exist, create it.'
            // @ts-ignore
            if (!node.children[seg[i]]) node.children[seg[i]] = {type: "dir", children: {}}
            // Move to the next directory.
            // @ts-ignore
            node = node.children[seg[i]]

        }
        // Now we're at the file. The last index of the seg length is the file name.
        // @ts-ignore
        node.children[seg[seg.length - 1]] = {type: "file", path}
    }
    return root
}

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
            <TreeView node={buildDirTree(project.files)} onSelect={setSelection} depth={0} name={"/"} />
        </div>
    )
}

export default FileExplorer