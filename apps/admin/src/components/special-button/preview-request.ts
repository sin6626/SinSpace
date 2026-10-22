/** Ignore responses invalidated by edits, a new preview window, or unmount. */
export function createPreviewRequest<T, R>(
  normalize: (snapshot: T) => Promise<R>,
  send: (result: R) => void,
  onError: () => void,
) {
  let version = 0
  return {
    invalidate() {
      version++
    },
    async run(snapshot: T) {
      const requestedVersion = ++version
      try {
        const result = await normalize(snapshot)
        if (requestedVersion === version) send(result)
      } catch {
        if (requestedVersion === version) onError()
      }
    },
  }
}
