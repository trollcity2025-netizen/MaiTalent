declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment | null): {
    render(children: React.ReactNode): void
    unmount(): void
  }
}

declare module 'react-dom' {
  import * as ReactDOM from 'react-dom'
  export default ReactDOM
}
