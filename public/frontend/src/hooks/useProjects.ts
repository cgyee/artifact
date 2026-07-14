import {useEffect, useState} from "react";
import type {Project} from "../types.ts";
import apiFetch from "../utils/apiFetch.ts";

const api = "/api"
async function getAll() {
    try {
        const res = await apiFetch(`${api}/projects`)
        console.log("projects", res)
        if (!res.ok) {
            if (res.redirected) {
                window.location.replace("/login")
            }
            return []
        }
        const projects: Project[] = await res.json()
        return projects
    } catch (e) {
        console.error(e)
        return []
    }
}

export default function useProjects() {
    const [projects, setProjects] = useState<Project[]>([])

    const listProjects = async () => {
        const projects = await getAll()
        setProjects(projects)
    }

    useEffect(() => {
        (async () => {
            await listProjects()
        })()
    },[])

    return {projects}
}