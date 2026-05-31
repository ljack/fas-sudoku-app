import express from 'express';
import path from 'path';
import { FeatureModule, FeatureContext } from '../../core/registry';

// In-memory connection map: gameId -> response streams
const activeConnections = new Map<string, express.Response[]>();

export const coopFeature: FeatureModule = {
  name: 'coop',

  onBoot: async (context: FeatureContext) => {
    console.log('[Co-Op] Booting feature routes...');

    // 1. Serve static client resources
    const publicPath = path.join(__dirname, 'public');
    context.router.use('/coop-client', express.static(publicPath));

    // 2. Server-Sent Events (SSE) Route
    context.router.get('/api/sudoku/:id/coop-stream', (req, res) => {
      const gameId = req.params.id;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders(); // Keep connection stream open

      if (!activeConnections.has(gameId)) {
        activeConnections.set(gameId, []);
      }
      activeConnections.get(gameId)!.push(res);

      console.log(`[Co-Op] Player joined stream: ${gameId}. Total connections: ${activeConnections.get(gameId)!.length}`);

      // Initial keep-alive payload
      res.write('data: {"type": "connected"}\n\n');

      req.on('close', () => {
        const list = activeConnections.get(gameId) || [];
        const idx = list.indexOf(res);
        if (idx !== -1) {
          list.splice(idx, 1);
        }
        if (list.length === 0) {
          activeConnections.delete(gameId);
        }
        console.log(`[Co-Op] Player disconnected: ${gameId}. Remaining connections: ${list.length}`);
      });
    });

    // 3. API Route: Broadcast peer focus changes
    context.router.post('/api/sudoku/:id/focus', (req, res) => {
      const gameId = req.params.id;
      const { cellIndex, playerId, color, nickname } = req.body;

      const connections = activeConnections.get(gameId) || [];
      const payload = JSON.stringify({
        type: 'focus',
        cellIndex,
        playerId,
        color,
        nickname
      });

      // Broadcast to everyone else in the game
      connections.forEach(conn => {
        try {
          conn.write(`data: ${payload}\n\n`);
        } catch (err: any) {
          console.warn('[Co-Op] Failed write to client connection:', err.message);
        }
      });

      res.json({ success: true });
    });

    // 4. Hook into Sudoku EventBus: Broadcast moves
    context.eventBus.on('sudoku:move', (eventData) => {
      const { gameId, cellIndex, value, grid, status } = eventData;
      const connections = activeConnections.get(gameId) || [];
      
      const payload = JSON.stringify({
        type: 'move',
        cellIndex,
        value,
        grid,
        status
      });

      connections.forEach(conn => {
        try {
          conn.write(`data: ${payload}\n\n`);
        } catch (err: any) {
          console.warn('[Co-Op] Failed write on EventBus move:', err.message);
        }
      });
    });

    // 5. Hook into Sudoku EventBus: Broadcast solve state
    context.eventBus.on('sudoku:solve', (eventData) => {
      const { gameId, grid, status } = eventData;
      const connections = activeConnections.get(gameId) || [];
      
      const payload = JSON.stringify({
        type: 'solve',
        grid,
        status
      });

      connections.forEach(conn => {
        try {
          conn.write(`data: ${payload}\n\n`);
        } catch (err: any) {
          console.warn('[Co-Op] Failed write on EventBus solve:', err.message);
        }
      });
    });
  }
};
