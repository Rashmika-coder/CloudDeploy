const request = require('supertest');
const app = require('../src/app');
const { getSystemMetrics, isRunningInDocker } = require('../src/system');

describe('System Metrics Utility Checks', () => {
  test('should return standard metrics with correct property types', () => {
    const metrics = getSystemMetrics();

    expect(metrics).toHaveProperty('hostname');
    expect(metrics).toHaveProperty('platform');
    expect(metrics).toHaveProperty('type');
    expect(metrics).toHaveProperty('release');
    expect(metrics).toHaveProperty('uptime');
    expect(metrics).toHaveProperty('loadAverage');
    expect(metrics).toHaveProperty('memory');
    expect(metrics).toHaveProperty('cpu');
    expect(metrics).toHaveProperty('isDocker');
    expect(metrics).toHaveProperty('timestamp');

    expect(typeof metrics.hostname).toBe('string');
    expect(typeof metrics.platform).toBe('string');
    expect(typeof metrics.uptime).toBe('number');
    expect(Array.isArray(metrics.loadAverage)).toBe(true);
    expect(typeof metrics.isDocker).toBe('boolean');
    expect(typeof metrics.cpu.cores).toBe('number');
  });

  test('should execute docker check without exceptions', () => {
    expect(() => isRunningInDocker()).not.toThrow();
    expect(typeof isRunningInDocker()).toBe('boolean');
  });
});

describe('Express Application API Endpoint integration tests', () => {
  test('GET /health - Should return success status and environment information', async () => {
    const res = await request(app).get('/health');
    
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('environment');
  });

  test('GET /api/metrics - Should return detailed metrics and client app info', async () => {
    const res = await request(app).get('/api/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('cpu');
    expect(res.body).toHaveProperty('memory');
    expect(res.body).toHaveProperty('app');
    expect(res.body.app).toHaveProperty('version');
    expect(res.body.app).toHaveProperty('environment');
  });

  test('GET /non-existent-route - Should return SPA main index file', async () => {
    const res = await request(app).get('/random-page-route');
    
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
