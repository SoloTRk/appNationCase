import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from '../services/feature-flag.service';

export function createFeatureCheckMiddleware(featureFlagService: FeatureFlagService) {
  return (...flagKeys: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.featureFlags) {
        req.featureFlags = {};
      }

      for (const key of flagKeys) {
        req.featureFlags[key] = featureFlagService.getFlag(key);
      }

      next();
    };
  };
}
