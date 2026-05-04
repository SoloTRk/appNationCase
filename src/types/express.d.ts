export type ClientType = 'web' | 'mobile' | 'desktop';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
      clientType?: ClientType;
      featureFlags?: Record<string, boolean | number>;
    }
  }
}
