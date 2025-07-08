// Unit tests for deleteAccount.controller.ts
import { deleteAccount } from '../../../../src/modules/auth/controllers/deleteAccount.controller';
import { Request } from 'express';

describe('Delete Account Controller', () => {
  it('should delete the account successfully', async () => {
    const req = {
      user: { id: 'userId' },
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      acceptsCharsets: jest.fn(),
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteAccount(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
  });
});
