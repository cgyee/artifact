import type {TreeNode} from "../types.ts";

type Props = {
    name: string,
    node: TreeNode
    depth: number,
    onSelect: (name: string) => void
}

const TreeView = ({name, node, depth, onSelect}: Props) => {
    if (node.type === "dir") {
        const children = Object.keys(node.children)
        return (
            <div key={name} style={{paddingLeft: `${depth * 10}px`}}>
                {name}
                {children.map((child) => (
                    <TreeView
                        key={child}
                        name={child}
                        node={node.children[child]}
                        depth={depth + 1}
                        onSelect={onSelect}
                    />
                ))}
            </div>)

    } else if (node.type === "file") {
        return <button key={name} onClick={() => onSelect(name)}>{name}</button>
    } else {
        return <></>
    }
}

export default  TreeView