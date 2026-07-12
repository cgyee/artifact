import {useUser} from "../hooks/useUser.ts";
import apiFetch from "../utils/apiFetch.ts";


const Dashboard = () => {
    const {user, logoutUser} = useUser()
    const onClick = async () => {
        const res = await apiFetch("/api/project/new")
        console.log(res)
        if (res.redirected) window.location.assign(res.url)
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
                </div>}
        </div>
    )
}

export default Dashboard