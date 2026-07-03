import type {Files, Project, Selection, TreeNode} from "../types";
import TreeView from "./TreeView.tsx";
import {useState} from "react";
import {Form} from "react-router";

type Props = {
    selection: Selection,
    onSelection: (file: Selection) => void
    project: Project
    renameFile: (oldName: string, newName: string) => void
    deleteFile: (name: string) => void
    createFile: (name: string) => void
    deleteFolder: (name: string) => void
    renameFolder: (oldName: string, newName: string) => void
    createImgFile: (formData: FormData) => Promise<boolean>
}

const FILENAME_REGEX = /^[a-zA-Z0-9-_]+\.(html|css|js|json|txt|md)$/
const IMAGENAME_REGEX = /^[a-zA-Z0-9-_]+\.(png|jpg|jpeg|gif)$/
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
        if (path.endsWith(".keep")) continue
        const file = path.slice(path.lastIndexOf("/") + 1)
        if (FILENAME_REGEX.test(file)) {
            node.children[seg[seg.length - 1]] = {type: "file", path}
        }
        if (IMAGENAME_REGEX.test(file)) {
            node.children[seg[seg.length -1]] = {type: "imgFile", path}
        }
    }
    return root
}



const FileExplorer = ({ project, selection, onSelection, renameFile, deleteFile, createFile, createImgFile, renameFolder, deleteFolder }: Props ) => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set([""]))
    const onExpanded = (dir: string) => {
        if (!dir) return
        setExpanded(prev => {
            const next = new Set(prev)
            if(next.has(dir)) {
                next.delete(dir)
                return next
            }
            next.add(dir)
            return next
        })
    }

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

    const imgNameValid = (fileName: string, fullPath: string) => {
        console.log(fullPath, fileName)
        if (`${fullPath}${fileName}` in project.files) {
            window.alert("File already exists")
            return false
        }
        if (!IMAGENAME_REGEX.test(fileName)) {
            window.alert("Invalid image file name")
            return false
        }
        return true
    }

    const generatePath = (path:string) => {
        if (path === "") return ""
        // I need the value of the directory before the last "."
        const lastDirIdx = path.lastIndexOf("/")
        return lastDirIdx === -1 ? "" : path.slice(0, lastDirIdx + 1)
    }

    const handleAddOnClick = () => {
        const fileName = window.prompt("Enter file name")
        // so the linter stops complaining that fullPath could be undefined
        if (!fileName || !selection) return
        const fullPath = generatePath(selection.path)
        if (!fileNameValid(fileName, fullPath)) return
        createFile(`${fullPath}${fileName}`)
    }

    const handleAddDirOnClick = () => {
        const dirName = window.prompt("Enter directory name")
        if (!dirName) return
        const path = generatePath(selection.path)
        if (path in project.files) {
            window.alert("Directory already exists")
            return
        }
        if (!DIRECTORY_REGEX.test(dirName)) {
            window.alert("Invalid directory name")
            return
        }
        createFile(`${path}${dirName}/.keep`)
        onSelection({kind: "dir", path: `${path}${dirName}/.keep`})
    }

    const handleRenameOnClick = () => {
        const newName = window.prompt("Enter new file name")
        if (!newName) return
        if (["index.html", "styles.css", "app.js"].includes(selection.path)) {
            window.alert("Cannot rename default files")
            return
        }

        if (selection.kind === "dir") {
            const path = generatePath(selection.path)
            const dir = path.slice(0, -1)
            const idx = dir.lastIndexOf("/")
            const targetDir = idx === -1 ? "" : dir.slice(0, idx + 1)
            const newPath = targetDir + newName + "/"
            if (!DIRECTORY_REGEX.test(newName)|| (newPath in project.files)) {
                window.alert("Invalid directory name")
                return
            }
            renameFolder(path, newPath)
            onSelection({kind: "dir", path: `${newPath}.keep`
        })
            return
        }
        const path = generatePath(selection.path)
        const fullPath = `${path}${newName}`

        // determine if the current selection is a "standard" file or an image
        if ((selection.kind === "imgFile") && !imgNameValid(newName, path)) return
        if ((selection.kind === "file") && !fileNameValid(newName, path)) return
        renameFile(selection.path, fullPath)
        onSelection({kind: "file", path: fullPath})
    }

    const handleDeleteOnClick = () => {
        const conf = window.confirm("Are you sure you want to delete this file?")
        if (!conf) return
        if (["index.html", "styles.css", "app.js"].includes(selection.path)) {
            window.alert("Cannot delete default files")
            return
        }
        if (selection.kind === "dir") {
            const path = generatePath(selection.path)
            deleteFolder(path)
            onSelection({kind: "file", path: "index.html"})
            return
        }
        deleteFile(selection.path)
    }
    const handelSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log(e.currentTarget)
        const formData = new FormData(e.currentTarget)
         createImgFile(formData).then(
            (r) => {
                if (!r) {
                    window.alert("Error uploading image")
                    return
                }
                window.alert("Image uploaded successfully")
            },
            (err) => {
                window.alert("Error uploading image: " + err)
            }
        )

    }

    return (
        <div>
            <div>FileExplorer</div>
            <button onClick={handleAddOnClick}>+</button>
            <button onClick={handleRenameOnClick}>Rename</button>
            <button onClick={handleDeleteOnClick}>---</button>
            <button onClick={handleAddDirOnClick}>+Folder</button>
            <Form onSubmit={(e) => handelSubmit(e)} method="post" action={"/"}>
                <label htmlFor="imgFile">Upload Image</label>
                <input hidden id={"imgFile"} name="imgFile" type="file" accept={"image/jpeg, image/jpg, image/png"}></input>
                <button type="submit">Submit</button>
            </Form>
            <TreeView node={buildDirTree(project.files)} selection={selection} onSelect={onSelection} expanded={expanded} onExpanded={onExpanded} depth={0} name={""} path={""} />
        </div>
    )
}
export default FileExplorer

