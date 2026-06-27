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
    kind: "file" | "dir"
    path: string
}

export type TreeNode =
    | { type: "dir"; children: Record<string, TreeNode> }
    | { type: "file"; path: string };