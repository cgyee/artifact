import { useEffect, useMemo, useState } from "react";
import type {File, Kind} from "../types";
import { debounce } from "../util/debounce";
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";

type Props = {
    src: string
    name: string
    file: File
    kind: Kind
    onChange: (content: string) => void
    resetLogs: () => void
}

const Editor = ({name, src, resetLogs, kind, file, onChange}: Props) => {
    const [enabled, setEnabled] = useState<boolean>(false)
    const disabled = kind === "dir" || kind === "imgFile"
    const [renderToken, setRenderToken] = useState(0);

    const refreshNow = () => {
        setRenderToken(prev => prev + 1);
        resetLogs();
    }

    const debouncedRefresh = useMemo(
        () => debounce(refreshNow, 300),
        []
    )

    const getFileExtension = (file: string) => {
        if (file.endsWith(".keep")) return ""
        const idx = file.lastIndexOf(".")
        return idx === -1 ? "" : file.slice(idx + 1)
    }

    const getLanguageExtension = (ext: string) => {
        switch (ext) {
            case "js":
                return () => javascript()
            case "html":
                return () => html()
            case "css":
                return () => css()
            default:
                return () => html()
        }
    }

    const handleAutoRefreshClick = () => setEnabled(prev => !prev)

    useEffect(() => {
        if (enabled) debouncedRefresh()
    }, [file, enabled])

    return (
        <>
            <button onClick={refreshNow}>Play</button>
            <button onClick={handleAutoRefreshClick}>Auto Refresh: {enabled ? 'On' : 'Off'}</button>
            <div style={{"textAlign": "left"}}>
                <CodeMirror
                    value={file.content}
                    height={"400px"}
                    width={"100%"}
                    theme={"dark"}
                    extensions={[getLanguageExtension(getFileExtension(name))()]}
                    basicSetup={true}
                    editable={!disabled}
                    onChange={(value, _) => onChange(value)}
                />
            </div>
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

