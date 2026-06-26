import type {Files, Project, TreeNode} from "../types";
import TreeView from "./TreeView.tsx";

type Props = {
    selection: string,
    onSelection: (file: string) => void
    project: Project
    renameFile: (oldName: string, newname: string) => void
    deleteFile: (name: string) => void
    createFile: (name: string) => void
    deleteFolder: (name: string) => void
    renameFolder: (oldName: string, newName: string) => void
}
const FILENAME_REGEX = /^[a-zA-Z0-9-_]+\.(html|css|js)$/
const DIRECTORY_REGEX = /^[a-zA-Z0-9-_]+$/


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


const FileExplorer = ({project, selection, onSelection, renameFile, deleteFile, createFile, renameFolder, deleteFolder }: Props ) => {
    const fileNameValid = (fileName: string, fullPath: string) => {
        if (`${fullPath}${fileName}` in project.files) {
            window.alert("File already exists")
            return false
        }
        if (!FILENAME_REGEX.test(fileName)) {
            window.alert("Invalid file name")
            return false
        }
        return true
    }

    const generatePath = (path:string) => {
        if (path === "") return ""
        // I need the value of the directory before the last "."
        const lastDirIdx = selection.lastIndexOf("/")
        return lastDirIdx === -1 ? "" : selection.slice(0, lastDirIdx + 1)
    }

    const handleAddOnClick = () => {
        const fileName = window.prompt("Enter file name")
        // so the linter stops complaining that fullPath could be undefined
        if (!fileName || !selection) return
        const fullPath = generatePath(selection)
        if (!fileNameValid(fileName, fullPath)) return
        createFile(`${fullPath}${fileName}`)
    }

    const handleAddDirOnClick = () => {
        const dirName = window.prompt("Enter directory name")
        if (!dirName) return
        const path = generatePath(selection)
        if (path in project.files) {
            window.alert("Directory already exists")
            return
        }
        if (!DIRECTORY_REGEX.test(dirName)) {
            window.alert("Invalid directory name")
            return
        }
        createFile(`${path}${dirName}/.keep`)
        onSelection(`${path}${dirName}/.keep`)
    }

    const handleRenameOnClick = () => {
        const newName = window.prompt("Enter new file name")
        if (!newName) return
        if (["index.html", "styles.css", "app.js"].includes(selection)) {
            window.alert("Cannot rename default files")
            return
        }

        if (selection.includes(".keep")) {
            const path = generatePath(selection)
            const dir = path.slice(0, -1)
            const idx = dir.lastIndexOf("/")
            const targetDir = idx === -1 ? "" : dir.slice(0, idx + 1)
            const newPath = targetDir + newName + "/"
            if (!DIRECTORY_REGEX.test(newName)|| (newPath in project.files)) {
                window.alert("Invalid directory name")
                return
            }
            renameFolder(path, newPath)
            onSelection(`${newPath}.keep`)
            return
        }
        const path = generatePath(selection)
        const fullPath = `${path}${newName}`
        if (!fileNameValid(newName, path)) return
        renameFile(selection, fullPath)
        onSelection(fullPath)
    }

    const handleDeleteOnClick = () => {
        const conf = window.confirm("Are you sure you want to delete this file?")
        if (!conf) return
        if (["index.html", "styles.css", "app.js"].includes(selection)) {
            window.alert("Cannot delete default files")
            return
        }
        if (selection.includes(".keep")) {
            const path = generatePath(selection)
            deleteFolder(path)
            onSelection("index.html")
            return
        }
        deleteFile(selection)
    }
    return (
        <div>
            <div>FileExplorer</div>
            <button onClick={handleAddOnClick}>+</button>
            <button onClick={handleRenameOnClick}>Rename</button>
            <button onClick={handleDeleteOnClick}>---</button>
            <button onClick={handleAddDirOnClick}>+Folder</button>
            <TreeView node={buildDirTree(project.files)} selection={selection} onSelect={onSelection} depth={0} name={""} path={""} />
        </div>
    )
}

export default FileExplorer

