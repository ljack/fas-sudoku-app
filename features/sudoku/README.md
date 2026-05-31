# Example Feature: Sudoku Game (FAS Compliant)

This feature implements a complete, web-based **Sudoku game** with a built-in auto-solver, real-time database state tracking, and a premium cosmic dark mode UI.

---

## 1. FAS Sandboxing Alignment

This feature is designed to be 100% self-contained and modular. Deleting the `features/sudoku/` folder and setting `"sudoku": false` in `config.json` fully prunes the application without leaving dead imports or broken routes:

*   **Database Isolation (onBoot):** Schema migrations are registered dynamically via `context.db.registerMigration`. If disabled, no tables are created or queries run against PostgreSQL.
*   **Encapsulated Assets (Dynamic Routing):** All static frontend UI assets (HTML, CSS, client-side JS) reside in `/features/sudoku/public/`. The Express static server mounts these dynamically at `/sudoku-client/`.
*   **Decoupled REST APIs:** API handlers are mounted programmatically in the `onBoot` hook using `context.router`.

---

## 2. API & Routing Design

The feature serves both the web interface and JSON APIs, mapping each active board to a unique, restful identifier (no login required).

### Page Navigation
- `GET /sudoku` -> Creates a new game board in the database, generates a solvable puzzle, and redirects the browser to the restful page: `/sudoku/:id`.
- `GET /sudoku/:id` -> Serves the web-based Sudoku client page representing the specific board.

### JSON API
- `GET /api/sudoku/:id` -> Returns the current board state and difficulty information.
- `POST /api/sudoku/:id/move` -> Places a number (1-9) or clears a cell. Validates that starting (initial) cells are not altered. Returns updated grid.
- `POST /api/sudoku/:id/solve` -> Solves the puzzle instantly using the backtracking engine and updates the database state to `solved`.

---

## 3. The Backtracking Solver Algorithm

The core puzzle solver uses a recursive depth-first backtracking algorithm:
1.  **Scan for empty cell:** Finds the next unassigned cell (represented by `0` in the 81-char string).
2.  **Try candidates:** Systematically attempts values 1 through 9.
3.  **Conflict Validation:** Checks if the candidate violates row, column, or 3x3 box rules (no duplicates allowed).
4.  **Recurse:** If valid, assigns the value and recursively attempts to solve the rest of the board.
5.  **Backtrack:** If a downstream conflict occurs, resets the cell to `0` and continues to the next candidate.
