import type {Selection, TreeNode} from "../types.ts";

type Props = {
    name: string,
    path: string,
    node: TreeNode
    depth: number,
    selection: Selection,
    onSelect: (selection: Selection) => void
}

const TreeView = ({name, path,  node, depth, selection, onSelect}: Props) => {

    if (node.type === "dir") {
        const children = Object.keys(node.children)
        const dir = path + "/"
        const isActive = selection.kind === "dir"
        return (
            <div  key={name} style={{paddingLeft: `${depth * 10}px`}}>
                {name === "" ? "" : <button style={{backgroundColor: isActive ? "yellow" : ""}} key={name + "view"} onClick={() => onSelect({ kind: "dir", path: dir })}>{name}</button> }
                {children.map((child) => (
                    child.includes(".keep") ? <></> :
                        <TreeView
                            key={child}
                            name={child}
                            path={path === "" ? child: `${path}/${child}`}
                            node={node.children[child]}
                            depth={depth + 1}
                            onSelect={onSelect}
                            selection={selection}
                        />
                ))}
            </div>)

    } else if (node.type === "file") {
        return <button key={name} onClick={() => onSelect({ kind: "file", path })}>{name}</button>
    } else {
        return <></>
    }
}

export default  TreeView