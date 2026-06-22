type Props = {
    selection: string,
    setSelection: (file: string) => void
}

const FileExplorer = ({selection, setSelection}: Props ) => {
    const files = ["index.html", "styles.css", "app.js",]
    return (
        <div>
            <div>FileExplorer</div>
            { files.map((file) => (
                <button key={file} disabled={file === selection} onClick={() => setSelection(file)}>{file}</button>
            ))}
        </div>
    )
}

export default FileExplorer