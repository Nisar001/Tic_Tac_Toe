// Unit tests for changePassword.controller.ts
import { changePassword } from '../../../../src/modules/auth/controllers/changePassword.controller';
import { Request } from 'express';

describe('Change Password Controller', () => {
  it('should change the password successfully', async () => {
    const req = {
      body: { oldPassword: 'oldPass', newPassword: 'newPass' },
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      acceptsCharsets: jest.fn(),
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await changePassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
  });
});
