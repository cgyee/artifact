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

export type Kind = "file" | "imgFile" | "dir"

export type Selection = {
    kind: Kind
    path: string
}

export type TreeNode =
    | { type: "dir"; children: Record<string, TreeNode> }
    | { type: Exclude<Kind, "dir">; path: string };

export type LogEntry = {
    source: string
    level: "error" | "warn" | "info" | "log"
    args: string[]
    timestamp: number
    stack?: string
}

export type User = {
    username: string
    createdAt: string
}