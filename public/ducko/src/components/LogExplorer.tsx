import {useEffect} from "react";
import type {LogEntry} from "../types.ts";

type Props = {
    logs: LogEntry[]
    onLog: (logs: LogEntry) => void
}

const parseLog = (args: string[]) => args.map(l => JSON.parse(l)).join(" ")
const LogExplorer = ({logs, onLog} :Props) => {

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e?.data?.source !== "preview") return
            console.log(e.data)
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
                        <div key={log.level + idx}>error: {parseLog(log.args)}</div>
                        {log?.stack && <div key={log.level + idx + "stack"}>{log.stack}</div>}
                    </div>
                }
            })}
        </div>
    )
}

export default LogExplorer