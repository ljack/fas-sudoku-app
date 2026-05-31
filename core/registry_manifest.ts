// AUTO-GENERATED - DO NOT EDIT DIRECTLY
import { FeatureRegistry } from './registry';

import { leaderboardFeature } from '../features/leaderboard/feature';
import { coopFeature } from '../features/coop/feature';

export function registerActiveFeatures(registry: FeatureRegistry) {
  registry.register(leaderboardFeature);
  registry.register(coopFeature);
}
