import {useEffect, useMemo, useRef, useState} from "react";
import type {File, Kind} from "../types";
import { debounce } from "../utils/debounce";
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";

const APP_NAME = "artifact"
const PREVIEW_HOST = "http://preview.glitch.local:8080"

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
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const refreshNow = () => {
        setRenderToken(prev => prev + 1);
        resetLogs();
    }

    const debouncedRefresh = useMemo(
        () => debounce(refreshNow, 300),
        []
    )
    const debouncedPostMessage = useMemo(
        () => debounce((name: string) => {
            iframeRef.current?.contentWindow?.postMessage({
                source: APP_NAME, type: "css-update", file: name,
            }, `${PREVIEW_HOST}`)
        }, 400),
        []
    )

    const getFileExtension = (file: string) => {
        if (file.endsWith(".keep")) return ""
        const idx = file.lastIndexOf(".")
        return idx === -1 ? "" : file.slice(idx + 1)
    }
    const handleOnChange = (value: string) => {
        onChange(value)
        if((getFileExtension(name) === "css") && enabled) {
            debouncedPostMessage(name)
        }
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
        if (!enabled) return
        if (getFileExtension(name) === "css") return
        debouncedRefresh()
    }, [file, enabled])

    return (
        <>
            <button onClick={refreshNow}>Play</button>
            <button onClick={handleAutoRefreshClick}>Auto Refresh: {enabled ? 'On' : 'Off'}</button>
            <div>{name}</div>
            <div style={{"textAlign": "left"}}>
                <CodeMirror
                    value={file.content}
                    height={"400px"}
                    width={"100%"}
                    theme={"dark"}
                    extensions={[getLanguageExtension(getFileExtension(name))()]}
                    basicSetup={true}
                    editable={!disabled}
                    onChange={(value, _) => handleOnChange(value)}
                />
            </div>
            <iframe
                ref={iframeRef}
                title={"preview"}
                id={"preview"}
                src={`${PREVIEW_HOST}${src}/render?v=${renderToken}`}
                key={renderToken}
            ></iframe>
        </>
    )
}

export default Editor

