(() => {
    const safeStringify = a => {
        try {
            const result = JSON.stringify(a)
            return result === undefined ? String(a) : result  // "undefined", "function () {...}", etc.
        } catch {
            return String(a)  // catches circular refs too
        }
    }
    const send = (level, args, extra) => {
        try {
            window.parent.postMessage({
                source: "preview",
                level,
                args: args.map(a => safeStringify(a)),
                timestamp: Date.now(),
                ...extra,
            }, "*")
        } catch (e) {
            console.error(e)
        }
    }

    const originalLog = console.log
    const originalInfo = console.info
    const originalWarn = console.warn
    const originalError = console.error

    console.log = (...args) => { send("log", args); originalLog.apply(console, args) }
    console.info = (...args) => { send("info", args); originalInfo.apply(console, args) }
    console.warn = (...args) => { send("warn", args); originalWarn.apply(console, args) }
    console.error = (...args) => { send("error", args); originalError.apply(console, args) }

    window.addEventListener("error", (e) => {
        send("error", [e.message], { stack: e.error?.stack })
    })

    window.addEventListener("unhandledrejection", (e) => {
        send("error", [e.reason], { stack: e.reason?.stack })
    })

    window.addEventListener("message", (e) => {
        if (!(e?.data?.type === "css-update")) return

        const href = e.data.file
        const oldLink = document.querySelector(`link[rel="stylesheet"][href^="${href}"]`)
        if (!oldLink) return
        const newLink = document.createElement("link")
        newLink.rel = "stylesheet"
        newLink.href = `${href}?v=${Date.now()}`
        newLink.onload = () => oldLink.remove()

        oldLink.parentNode.insertBefore(newLink, oldLink.nextSibling)

    })
})()