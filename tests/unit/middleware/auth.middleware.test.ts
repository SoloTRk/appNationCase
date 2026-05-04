import { createRequest, createResponse } from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../../../src/middleware/auth.middleware';
import { ConfigService } from '../../../src/config';
import { ApiError } from '../../../src/utils/api-error';

const TEST_SECRET = 'test-secret';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  ConfigService.resetInstance();
});

afterAll(() => {
  ConfigService.resetInstance();
});

function makeToken(payload: object): string {
  return jwt.sign(payload, TEST_SECRET);
}

describe('authMiddleware', () => {
  it('sets req.user for a valid token', () => {
    const token = makeToken({ userId: 'user-1', email: 'test@example.com' });
    const req = createRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ userId: 'user-1', email: 'test@example.com' });
  });

  it('calls next with 401 when no authorization header', () => {
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
  });

  it('calls next with 401 for invalid token', () => {
    const req = createRequest({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
  });

  it('calls next with 401 for Bearer without token', () => {
    const req = createRequest({ headers: { authorization: 'Bearer ' } });
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
  });

  it('calls next with 401 for non-Bearer scheme', () => {
    const req = createRequest({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
    const res = createResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(401);
  });
});
