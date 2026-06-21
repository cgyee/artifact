import {useEffect, useState} from "react";
import * as React from "react";

const FileExplorer = ({setSelection}: { setSelection: React.Dispatch<React.SetStateAction<string>> } ) => {
    const htmlfile = "index.html"
    const cssfile = "style.css"
    const [option, setOption] = useState<string>(htmlfile)

    const handleFileChange = (selection: string) => {
        if (selection === option) return
        setOption(selection)
        console.log(selection)
    }
    useEffect(() => {
        setSelection(option)
    }, [option])
    return (
        <div>
            <div>FileExplorer</div>
            <button onClick={() => handleFileChange(htmlfile)}>{htmlfile}</button>
            <button onClick={() => handleFileChange(cssfile)}>{cssfile}</button>
        </div>
    )
}

export default FileExplorer