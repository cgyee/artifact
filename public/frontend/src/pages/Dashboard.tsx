import {useEffect, useState} from "react";

type User = {
    username: string
    createdAt: string
}

const logout = async () => {
    const res = await fetch("/api/logout", {credentials: "include"})
    if (res.ok) window.location.replace("/login")
}

const Dashboard = () => {
    const [user, setUser] = useState<User>()
    useEffect(() => {
        (async () => {
           try {
               const res = await fetch("/api/me", {credentials: "include"})
               console.log(res)
               if (!res.ok) {
                   window.location.replace("/login")
                   return
               }
               const data = await res.json()
               console.log(data)
               setUser(prevState => ({
                   ...prevState,
                   username: data.username,
                   createdAt: data.createdAt,
               }))
           } catch (e) {
               console.error(e)
           }
           return
        })()
    },[])
    return (
        <div>
            <h1>Dashboard</h1>
            {user &&
                <div>
                    <button onClick={logout}>Logout</button>
                    <div>Username: {user.username}</div>
                    <div>Created At: {user.createdAt}</div>
                </div>}
        </div>
    )
}

export default Dashboard