import express from 'express';
import path from 'path';
import { FeatureModule, FeatureContext } from '../../core/registry';

export const leaderboardFeature: FeatureModule = {
  name: 'leaderboard',

  onBoot: async (context: FeatureContext) => {
    console.log('[Leaderboard] Running migration setup...');

    // 1. Register Database Schema
    context.db.registerMigration('leaderboard', `
      CREATE TABLE IF NOT EXISTS sudoku_leaderboard (
        id SERIAL PRIMARY KEY,
        game_id VARCHAR(50) NOT NULL,
        nickname VARCHAR(100) NOT NULL,
        time_taken INT NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Serve public client directory
    const publicPath = path.join(__dirname, 'public');
    context.router.use('/leaderboard-client', express.static(publicPath));

    // 3. API: Submit high score
    context.router.post('/api/leaderboard', async (req, res) => {
      const { gameId, nickname, timeTaken } = req.body;

      if (!gameId || !nickname || typeof timeTaken !== 'number' || timeTaken <= 0) {
        return res.status(400).json({ success: false, error: 'Missing or invalid parameters.' });
      }

      try {
        // Validate game exists and is solved in DB before accepting score
        const gameRes = await context.db.query('SELECT status FROM sudoku_games WHERE id = $1', [gameId]);
        if (gameRes.rowCount === 0) {
          return res.status(404).json({ success: false, error: 'Game not found.' });
        }

        const game = gameRes.rows[0];
        if (game.status !== 'solved') {
          return res.status(400).json({ success: false, error: 'Cannot submit score for an unsolved game.' });
        }

        // Insert score
        await context.db.query(
          `INSERT INTO sudoku_leaderboard (game_id, nickname, time_taken, difficulty)
           VALUES ($1, $2, $3, $4)`,
          [gameId, nickname.trim(), timeTaken, 'standard']
        );

        res.json({ success: true });
      } catch (err: any) {
        console.error('[Leaderboard] Failed to submit score:', err.message);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // 4. API: Fetch top scores
    context.router.get('/api/leaderboard', async (req, res) => {
      try {
        const result = await context.db.query(
          `SELECT nickname, time_taken, difficulty, created_at 
           FROM sudoku_leaderboard 
           ORDER BY time_taken ASC 
           LIMIT 10`
        );
        res.json({ success: true, scores: result.rows });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
  }
};
