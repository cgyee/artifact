import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer.tsx";
import {useState} from "react";

export const Edit = () => {
    const [selection, setSelection] = useState<string>("")
    return (
        <>
            <FileExplorer setSelection={setSelection}/>
            <Editor selection={selection}/>
        </>

    )
}
