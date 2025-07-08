// Unit tests for validation.middleware.ts
import { validateUserRegistration } from '../../../src/middlewares/validation.middleware';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: () => true,
    array: () => [],
  })),
}));

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockImplementation(() => res),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should validate username correctly', async () => {
    req.body = { username: 'valid_username' };

    await validateUserRegistration[0](req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return error for invalid username', async () => {
    req.body = { username: 'invalid username!' };

    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid username format', path: 'username' }],
    });

    await validateUserRegistration[0](req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'username', message: 'Invalid username format' }],
    });
  });

  // Add similar test cases for email, password, confirmPassword, phoneNumber, and dateOfBirth validations
});
