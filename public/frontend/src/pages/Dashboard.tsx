import {useUser} from "../hooks/useUser.ts";
import apiFetch from "../utils/apiFetch.ts";
import useProjects from "../hooks/useProjects.ts";


const Dashboard = () => {
    const {user, logoutUser} = useUser()
    const {projects} = useProjects()
    const onClick = async () => {
        const res = await apiFetch("/api/project/new")
        console.log(res)
        if (res.redirected) window.location.assign(res.url)
    }
    const onEdit = (id: string) => {
        window.location.assign(`/project/${id}`)
    }
    return (
        <div>
            <h1>Dashboard</h1>
            {user &&
                <div>
                    <button onClick={logoutUser}>Logout</button>
                    <button onClick={onClick}>Create Project</button>
                    <div>Username: {user.username}</div>
                    <div>Created At: {user.createdAt}</div>
                </div>
            }
            {projects.length > 0 && projects.map(project =>
                <div key={project.id}>
                    <div>{project.id}</div>
                    <button onClick={() => onEdit(project.id)}>Edit</button>
                </div>
            )}
        </div>
    )
}

export default Dashboard