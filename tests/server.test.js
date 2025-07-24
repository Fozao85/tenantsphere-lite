const request = require('supertest');
const app = require('../src/server');

describe('Server Health Check', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'Tenantsphere Lite');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/docs should return API documentation', async () => {
    const response = await request(app)
      .get('/api/docs')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'API Documentation');
    expect(response.body).toHaveProperty('endpoints');
  });

  test('GET /nonexistent should return 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Not Found');
  });
});

describe('API Endpoints', () => {
  test('GET /api/properties should return placeholder response', async () => {
    const response = await request(app)
      .get('/api/properties')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Get all properties endpoint');
    expect(response.body).toHaveProperty('status', 'Not implemented yet');
  });

  test('GET /api/users should return placeholder response', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Get all users endpoint');
    expect(response.body).toHaveProperty('status', 'Not implemented yet');
  });

  test('GET /api/agents should return placeholder response', async () => {
    const response = await request(app)
      .get('/api/agents')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Get all agents endpoint');
    expect(response.body).toHaveProperty('status', 'Not implemented yet');
  });
});
