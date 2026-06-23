import {useEffect, useMemo, useState} from "react";
import type {File} from "../types";
import { debounce } from "../util/debounce";

type Props = {
    src: string
    name: string
    file: File
    onChange: (content: string) => void
}

const Editor = ({name, src, file, onChange}: Props) => {
    const [enabled, setEnabled] = useState<boolean>(false)
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
            <div>{name}</div>
            <textarea id={"editor"} value={file.content} onChange={(e) => onChange(e.target.value)}></textarea>
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

