const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const opts  = init ? init : {}
        return await fetch(input, {...opts, credentials: "include"})
}

export default apiFetch