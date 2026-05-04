import { FeatureFlagManager } from '../../../src/config/feature-flags';
import { FeatureFlagService } from '../../../src/services/feature-flag.service';

describe('FeatureFlagService', () => {
  let manager: FeatureFlagManager;
  let service: FeatureFlagService;

  beforeEach(() => {
    FeatureFlagManager.resetInstance();
    manager = FeatureFlagManager.getInstance();
    service = new FeatureFlagService(manager);
  });

  afterEach(() => {
    FeatureFlagManager.resetInstance();
  });

  describe('getFlag', () => {
    it('returns default value for STREAMING_ENABLED', () => {
      expect(service.getFlag('STREAMING_ENABLED')).toBe(true);
    });

    it('returns default value for PAGINATION_LIMIT', () => {
      expect(service.getFlag('PAGINATION_LIMIT')).toBe(20);
    });

    it('returns default value for AI_TOOLS_ENABLED', () => {
      expect(service.getFlag('AI_TOOLS_ENABLED')).toBe(true);
    });

    it('returns default value for CHAT_HISTORY_ENABLED', () => {
      expect(service.getFlag('CHAT_HISTORY_ENABLED')).toBe(true);
    });

    it('throws for unknown flag', () => {
      expect(() => service.getFlag('UNKNOWN_FLAG')).toThrow('Unknown feature flag');
    });
  });

  describe('isEnabled', () => {
    it('returns boolean flag value', () => {
      expect(service.isEnabled('STREAMING_ENABLED')).toBe(true);
    });
  });

  describe('setFlag', () => {
    it('updates flag value', () => {
      service.setFlag('STREAMING_ENABLED', false);
      expect(service.getFlag('STREAMING_ENABLED')).toBe(false);
    });

    it('validates PAGINATION_LIMIT range', () => {
      expect(() => service.setFlag('PAGINATION_LIMIT', 5)).toThrow('Validation failed');
      expect(() => service.setFlag('PAGINATION_LIMIT', 101)).toThrow('Validation failed');
    });

    it('accepts valid PAGINATION_LIMIT', () => {
      service.setFlag('PAGINATION_LIMIT', 50);
      expect(service.getFlag('PAGINATION_LIMIT')).toBe(50);
    });

    it('throws for wrong type', () => {
      expect(() => service.setFlag('STREAMING_ENABLED', 42 as unknown as boolean)).toThrow('Invalid type');
    });
  });

  describe('getAllFlags', () => {
    it('returns all flags', () => {
      const flags = service.getAllFlags();
      expect(flags).toHaveProperty('STREAMING_ENABLED');
      expect(flags).toHaveProperty('PAGINATION_LIMIT');
      expect(flags).toHaveProperty('AI_TOOLS_ENABLED');
      expect(flags).toHaveProperty('CHAT_HISTORY_ENABLED');
    });
  });
});
