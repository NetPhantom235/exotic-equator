import request from 'supertest';
import apiGateway from '../lib/api-gateway/gateway';
import { authService } from '../lib/auth/authService';
import { inventorySocketService } from '../lib/inventory/inventorySocket';

describe('Enterprise Inventory System API Gateway', () => {
  let server: any;

  beforeAll(() => {
    server = apiGateway.listen(3000);
    inventorySocketService;
  });

  afterAll(() => {
    server.close();
    inventorySocketService.shutdown();
  });

  test('GET /health should return system status', async () => {
    const response = await request(apiGateway).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
  });

  test('Authentication middleware should enforce security', async () => {
    const protectedRoutes = ['/inventory/devices', '/monitoring/metrics'];
    
    for (const route of protectedRoutes) {
      const response = await request(apiGateway).get(route);
      expect(response.status).toBe(401);
    }
  });

  test('Inventory WebSocket should handle real-time updates', (done) => {
    const WebSocket = require('ws');
    const client = new WebSocket('ws://localhost:8081');

    client.on('open', () => {
      client.send(JSON.stringify({ type: 'SUBSCRIBE', data: 'devices' }));
    });

    client.on('message', (data: string) => {
      const message = JSON.parse(data);
      if (message.type === 'INITIAL_STATE') {
        expect(message.data).toBeInstanceOf(Array);
        client.close();
        done();
      }
    });
  });

  describe('Load Testing', () => {
    const artillery = require('artillery');
    const testScenario = {
      config: {
        target: 'http://localhost:3000',
        phases: [{ duration: 60, arrivalRate: 100 }],
        ensure: {
          p95: 200,
          maxErrorRate: 0.1
        }
      },
      scenarios: [{
        flow: [{
          get: {
            url: '/health'
          }
        }]
      }]
    };

    test('Should handle 100 req/sec for 1 minute', (done) => {
      artillery.run(testScenario, (err: any, report: any) => {
        expect(err).toBeNull();
        expect(report.aggregate.scenariosCompleted).toBeGreaterThan(6000);
        expect(report.aggregate.codes[200]).toBeGreaterThan(5900);
        done();
      });
    });
  });
});