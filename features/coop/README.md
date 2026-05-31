# Example Feature: Live Co-Op Multiplayer (FAS Compliant)

This feature enables multiple solvers to join the same game board and collaborate in real-time. It streams grid updates and cell focuses across browsers without the complexity of WebSockets.

---

## 1. FAS Integration & Decoupling

This feature is completely sandboxed inside `/features/coop/` and integrates with the parent application using decoupled events:

*   **Zero Core Engine Modifications:** The Express core engine does not contain any code related to SSE streams, multiplayer connections, or cursor tracking.
*   **Asset Injection Hook:** The core HTML router scans `config.json` and dynamically injects `inject.js` and `inject.css` into the `<head>` of the Sudoku page when `"coop": true` is set.
*   **Decoupled PubSub Communication:** The `coop` backend does not import or call `features/sudoku` handlers. Instead, it subscribes to `sudoku:move` and `sudoku:solve` events emitted over the global core `EventBus`.

---

## 2. API & Routing Design

### Server-Sent Events (SSE) Stream
- `GET /api/sudoku/:id/coop-stream` -> Establishes an open, persistent HTTP event stream (`text/event-stream`). Stores connections in an in-memory map grouped by `gameId`.

### Focus Broadcast API
- `POST /api/sudoku/:id/focus` -> Receives the index of the cell currently focused by player `X`, and broadcasts this state to all other SSE connections on that board.

### Client Logic (inject.js)
- Generates a local peer name (e.g. `Astro Solver #452`) and random color.
- Listens to incoming SSE events. On `move`, it triggers a custom window event (`sudoku:externalMove`) to tell the main game logic to re-render.
- Listens to `focusin` / `focusout` on the grid container using **event delegation** and transmits state to the `/focus` API.
- Renders glowing borders and hovering tag bubbles over cells focused by peer solvers.
