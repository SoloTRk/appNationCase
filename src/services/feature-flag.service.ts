import { FeatureFlagManager } from '../config/feature-flags';

export class FeatureFlagService {
  constructor(private readonly manager: FeatureFlagManager) {}

  getFlag<T extends boolean | number>(key: string): T {
    return this.manager.getFlag<T>(key);
  }

  isEnabled(key: string): boolean {
    return this.manager.isEnabled(key);
  }

  getAllFlags(): Record<string, boolean | number> {
    return this.manager.getAllFlags();
  }

  setFlag(key: string, value: boolean | number): void {
    this.manager.setFlag(key, value);
  }

  reload(): void {
    this.manager.reload();
  }
}
