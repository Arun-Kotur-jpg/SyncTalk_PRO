import request from 'supertest';
import app from '../app.js';

describe('GET /api/health', () => {
  it('should return 200 OK and status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
