import express from 'express';
import dotenv from 'dotenv';
import { FeatureRegistry } from './registry';
import { DatabaseManager } from './db';
import { registerActiveFeatures } from './registry_manifest';

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Core Router for features
const featureRouter = express.Router();
app.use('/', featureRouter);

// Initialize registry & database bridge
const registry = new FeatureRegistry();
const dbManager = new DatabaseManager();

async function startServer() {
  try {
    console.log('[Core] Registering active features from build-time manifest...');
    registerActiveFeatures(registry);

    console.log('[Core] Running onBoot lifecycle hooks...');
    await registry.executeBoot(featureRouter, dbManager);

    console.log('[Core] Executing database migrations...');
    await dbManager.executeMigrations();

    const server = app.listen(PORT, async () => {
      console.log(`[Core] Server successfully started on port ${PORT}`);
      
      console.log('[Core] Running onStart lifecycle hooks...');
      await registry.executeStart(featureRouter, dbManager);
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      console.log(`\n[Core] Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('[Core] HTTP server stopped accepting connections.');
        try {
          console.log('[Core] Running onShutdown lifecycle hooks...');
          await registry.executeShutdown(featureRouter, dbManager);
          
          console.log('[Core] Closing database pools...');
          await dbManager.close();
          
          console.log('[Core] Shutdown complete. Exiting.');
          process.exit(0);
        } catch (err: any) {
          console.error('[Core] Error during shutdown:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: any) {
    console.error('[Core] Server boot failed critically:', error.message);
    process.exit(1);
  }
}

startServer();
