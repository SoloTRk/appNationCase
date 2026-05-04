import { createRequest, createResponse } from 'node-mocks-http';
import { z } from 'zod';
import { validate } from '../../../src/middleware/validation.middleware';
import { ApiError } from '../../../src/utils/api-error';

describe('validate middleware', () => {
  const bodySchema = z.object({
    message: z.string().min(1).max(100),
  });

  const paramsSchema = z.object({
    chatId: z.string().uuid(),
  });

  it('passes validation with valid body', () => {
    const req = createRequest({ body: { message: 'Hello' } });
    const res = createResponse();
    const next = jest.fn();

    validate({ body: bodySchema })(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ message: 'Hello' });
  });

  it('calls next with 400 for invalid body', () => {
    const req = createRequest({ body: { message: '' } });
    const res = createResponse();
    const next = jest.fn();

    validate({ body: bodySchema })(req, res, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.details).toBeDefined();
  });

  it('calls next with 400 for missing required field', () => {
    const req = createRequest({ body: {} });
    const res = createResponse();
    const next = jest.fn();

    validate({ body: bodySchema })(req, res, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(400);
  });

  it('validates params', () => {
    const req = createRequest({ params: { chatId: 'not-a-uuid' } });
    const res = createResponse();
    const next = jest.fn();

    validate({ params: paramsSchema })(req, res, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(400);
  });

  it('validates params successfully', () => {
    const req = createRequest({ params: { chatId: '550e8400-e29b-41d4-a716-446655440000' } });
    const res = createResponse();
    const next = jest.fn();

    validate({ params: paramsSchema })(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
