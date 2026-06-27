import {useEffect, useMemo, useState} from "react";
import type {File} from "../types";
import { debounce } from "../util/debounce";

type Props = {
    src: string
    name: string
    file: File
    kind: "file" | "dir"
    onChange: (content: string) => void
}

const Editor = ({name, src, kind, file, onChange}: Props) => {
    const [enabled, setEnabled] = useState<boolean>(false)
    const disabled = kind === "dir"
    const [renderToken, setRenderToken] = useState(0);

    const refreshNow = () => setRenderToken(prev => prev + 1)

    const debouncedRefresh = useMemo(
        () => debounce(refreshNow, 300),
        []
    )

    const handleAutoRefreshClick = () => setEnabled(prev => !prev)

    useEffect(() => {
        if (enabled) debouncedRefresh()
    }, [file, enabled])

    return (
        <>
            <button onClick={refreshNow}>Play</button>
            <button onClick={handleAutoRefreshClick}>Auto Refresh: {enabled ? 'On' : 'Off'}</button>
            <div>{disabled ? "" : name}</div>
            <textarea disabled={disabled} id={"editor"} value={file.content} onChange={(e) => onChange(e.target.value)}></textarea>
            <iframe
                title={"preview"}
                id={"preview"}
                src={`${src}/render?v=${renderToken}`}
                key={renderToken}
            ></iframe>
        </>
    )
}

export default Editor

