import {useMemo, useState} from "react";
import type {File,} from "../pages/Edit.tsx";

type Props = {
    src: string
    name: string
    file: File
    onChange: (content: string) => void
}

function debounce<A extends unknown[]>(fn: (...args: A) => void, timeout = 300) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: A) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), timeout);
    };
}

const Editor = ({name, src, file, onChange}: Props) => {
    const [enabled, setEnabled] = useState<boolean>(false)
    const [renderToken, setRenderToken] = useState(0);

    const updatePreviewMemo = useMemo(
        () => debounce(() => {
            // don't really care about the result, just want to update the preview
            setRenderToken(prev => prev + 1)
            console.log("render token: ", renderToken)
        }, 300),
        [file]
    )

    const handleRefreshClick = () => {
        updatePreviewMemo()
    }
    const handleAutoRefreshClick = () => {
        const next = !enabled
        setEnabled(!next)
        if (!next) updatePreviewMemo()
    }

    return (
        <>
            <button onClick={(_) => {
                handleRefreshClick()
            }}>Play</button>
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

