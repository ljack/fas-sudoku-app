import { Router } from 'express';
import { EventEmitter } from 'events';
import { Pool } from 'pg';

export interface FeatureContext {
  router: Router;
  eventBus: EventEmitter;
  db: DatabaseBridge;
  state: Record<string, any>;
}

export interface DatabaseBridge {
  query: (text: string, params?: any[]) => Promise<any>;
  registerMigration: (featureName: string, sql: string) => void;
}

export interface FeatureModule {
  name: string;
  onBoot?: (context: FeatureContext) => Promise<void>;
  onStart?: (context: FeatureContext) => Promise<void>;
  onShutdown?: (context: FeatureContext) => Promise<void>;
}

export class FeatureRegistry {
  private features: FeatureModule[] = [];
  private eventBus = new EventEmitter();
  private sharedState: Record<string, any> = {};

  constructor() {
    // Avoid limiting listener counts for the global bus
    this.eventBus.setMaxListeners(0);
  }

  public register(feature: FeatureModule) {
    this.features.push(feature);
  }

  public getEventBus(): EventEmitter {
    return this.eventBus;
  }

  public getSharedState(): Record<string, any> {
    return this.sharedState;
  }

  public getFeatures(): FeatureModule[] {
    return this.features;
  }

  public async executeBoot(router: Router, db: DatabaseBridge) {
    const context: FeatureContext = {
      router,
      eventBus: this.eventBus,
      db,
      state: this.sharedState
    };

    for (const feature of this.features) {
      if (feature.onBoot) {
        console.log(`[Core] Booting feature: ${feature.name}`);
        await feature.onBoot(context);
      }
    }
  }

  public async executeStart(router: Router, db: DatabaseBridge) {
    const context: FeatureContext = {
      router,
      eventBus: this.eventBus,
      db,
      state: this.sharedState
    };

    for (const feature of this.features) {
      if (feature.onStart) {
        console.log(`[Core] Starting feature: ${feature.name}`);
        await feature.onStart(context);
      }
    }
  }

  public async executeShutdown(router: Router, db: DatabaseBridge) {
    const context: FeatureContext = {
      router,
      eventBus: this.eventBus,
      db,
      state: this.sharedState
    };

    for (const feature of this.features) {
      if (feature.onShutdown) {
        console.log(`[Core] Shutting down feature: ${feature.name}`);
        await feature.onShutdown(context);
      }
    }
  }
}
