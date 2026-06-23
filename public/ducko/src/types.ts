export type File = {
    type: string
    content: string
}

export type Files = {
    [key: string]: File
}

export type Project = {
    id: string
    files: Files
}
