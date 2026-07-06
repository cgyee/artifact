import {useEffect} from "react";
import type {LogEntry} from "../types.ts";

type Props = {
    logs: LogEntry[]
    onLog: (logs: LogEntry) => void
}

const parseLog = (args: string[]) => {
    if (!args || args.length === 0) return "";
    return args.map(l => JSON.parse(l)).map(i => typeof i === "object" && i !== null ? JSON.stringify(i) : String(i)).join(" ")
}
const LogExplorer = ({logs, onLog} :Props) => {

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.origin !== "http://preview.glitch.local:8080") return
            if (e?.data?.source !== "preview") return
            onLog(e.data)
        }
        window.addEventListener("message", handler)
        return () => window.removeEventListener("message", handler)
    }, []);
    return (
        <div>
            <div>LogExplorer</div>
            {logs.map((log, idx) => {
                if (log.level === "log") return <div key={log.level + idx}>log: {parseLog(log.args)}</div>
                if (log.level === "info") {
                    return <div key={log.level + idx}>info: {parseLog(log.args)}</div>
                }
                if (log.level === "warn") return <div key={log.level + idx}>warn: {parseLog(log.args)}</div>
                if (log.level === "error") {
                    return <div key={log.level + idx + "error"}>
                        <div >error: {parseLog(log.args)}</div>
                        {log?.stack && <div>{log.stack}</div>}
                    </div>
                }
            })}
        </div>
    )
}

export default LogExplorer