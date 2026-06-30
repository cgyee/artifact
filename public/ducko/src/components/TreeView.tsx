import type {Selection, TreeNode} from "../types.ts";

type Props = {
    name: string,
    path: string,
    node: TreeNode
    depth: number,
    selection: Selection,
    onSelect: (selection: Selection) => void
    expanded: Set<string>
    onExpanded: (name: string) => void
}

const TreeView = ({name, path, expanded, onExpanded, node, depth, selection, onSelect}: Props) => {

    if (node.type === "dir") {
        const children = Object.keys(node.children)
        const dir = path + "/"
        const isActive = selection.kind === "dir" && selection.path === dir + ".keep"
        return (
            <div  key={"dir" + name + depth} style={{paddingLeft: `${depth * 10}px`}}>
                {name === ""
                    ? <></>
                    :<button
                        style={{backgroundColor: isActive ? "yellow" : ""}}
                        key={name + "view"}
                        onClick={() => onSelect({ kind: "dir", path: dir })}>{name}
                    </button> }
                {
                    Object.keys(node.children).length > 0 && name !== ""
                        ? <button
                            onClick={() => onExpanded(path)}>{expanded.has(path) ? "-" : "+" }
                          </button>
                        : <></>
                }
                {expanded.has(path) && children.map((child, idx) => (
                    child.includes(".keep") ? <></> :
                        <TreeView
                            key={child + idx + depth}
                            name={child}
                            path={path === "" ? child: `${path}/${child}`}
                            node={node.children[child]}
                            depth={depth + 1}
                            onSelect={onSelect}
                            selection={selection}
                            expanded={expanded}
                            onExpanded={onExpanded}
                        />
                ))}
            </div>)

    } else if (node.type === "file") {
        return <button key={name + depth} onClick={() => onSelect({ kind: "file", path })}>{name}</button>
    } else {
        return <></>
    }
}

export default  TreeView