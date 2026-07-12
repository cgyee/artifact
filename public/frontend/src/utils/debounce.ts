export function debounce<A extends unknown[]>(fn: (...args: A) => void, timeout = 300) {
    let timer: ReturnType<typeof setTimeout> | undefined
    return (...args: A) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), timeout)
    }
}
