import { connectDB } from '../../../src/config/database';

describe('Database Connection', () => {
  it('should connect to the database successfully', async () => {
    // Mock the connection function
    const mockConnect = jest.fn().mockResolvedValue('Connected');
    jest.mock('../../../src/config/database', () => ({
      connectDB: mockConnect,
    }));

    const result = await connectDB();

    expect(mockConnect).toHaveBeenCalled();
    expect(result).toBe('Connected');
  });
});
