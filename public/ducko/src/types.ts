export type File = {
    content: string
}

export type Files = {
    [key: string]: File
}

export type Project = {
    id: string
    files: Files
}

export type Selection = {
    kind: "file" | "imgFile" | "dir"
    path: string
}

export type TreeNode =
    | { type: "dir"; children: Record<string, TreeNode> }
    | { type: "file" | "imgFile"; path: string };

export type LogEntry = {
    source: string
    level: "error" | "warn" | "info" | "log"
    args: string[]
    timestamp: number
    stack?: string
}