import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer.tsx";
import {useState} from "react";

export const Edit = () => {
    const [selection, setSelection] = useState<string>("index.html")
    return (
        <>
            <FileExplorer selection={selection} setSelection={setSelection}/>
            <Editor selection={selection}/>
        </>

    )
}
