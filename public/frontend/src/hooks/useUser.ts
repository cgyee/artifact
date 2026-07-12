import {useEffect, useState} from "react";
import apiFetch from "../utils/apiFetch.ts";
import type {User} from "../types.ts";

const logout = async () => {
    const res = await apiFetch("/api/logout", {credentials: "include"})
    if (res.ok) window.location.replace("/login")
}

export function useUser() {
    const [user, setUser] = useState<User>()

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch("/api/me")
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

    const logoutUser = async () => {
        await logout()
        setUser({username: "", createdAt: ""})
    }

    return {user, logoutUser}
}
