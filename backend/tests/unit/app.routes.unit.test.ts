// Unit tests for app.routes.ts
import request from 'supertest';
import express from 'express';
import router from '../../src/app.routes';

const app = express();
app.use(express.json());
app.use('/api', router);

describe('App Routes', () => {
  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Tic Tac Toe API v1.0.0',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          game: '/api/game',
          chat: '/api/chat',
          health: '/health'
        }
      });
    });
  });

  describe('Route Integration', () => {
    it('should include auth routes', async () => {
      const response = await request(app).get('/api/auth');
      expect(response.status).not.toBe(404);
    });

    it('should include game routes', async () => {
      const response = await request(app).get('/api/game');
      expect(response.status).not.toBe(404);
    });

    it('should include chat routes', async () => {
      const response = await request(app).get('/api/chat');
      expect(response.status).not.toBe(404);
    });
  });
});
