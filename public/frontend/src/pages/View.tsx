import Preview from "../components/Preview.tsx";
import {useParams} from "react-router";

const View = () => {
    const projectId = useParams()?.projectId ?? ""
    return (
        <Preview src={`/api/project/${projectId}`} />
    )
}
export default View;