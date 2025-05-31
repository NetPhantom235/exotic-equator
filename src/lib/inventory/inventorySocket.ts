import { WebSocketServer } from 'ws';
import { deviceService } from '../deviceService';
import { metricsCollector } from '../metricsCollector';

export class InventoryWebSocketService {
  private wss: WebSocketServer;
  private connections = new Set<WebSocket>();

  constructor(port: number = 8081) {
    this.wss = new WebSocketServer({ port });
    this.setupConnectionHandling();
    this.subscribeToDeviceUpdates();
  }

  private setupConnectionHandling() {
    this.wss.on('connection', (ws) => {
      metricsCollector.trackSocketConnection();
      this.connections.add(ws);

      ws.on('message', (data) => this.handleMessage(ws, data.toString()));
      ws.on('close', () => this.handleDisconnect(ws));
      ws.on('pong', () => (ws['isAlive'] = true));

      // Send initial device state
      deviceService.getAllDevices().then(devices => {
        ws.send(JSON.stringify({
          type: 'INITIAL_STATE',
          data: devices
        }));
      });
    });

    // Enable connection health checks
    setInterval(() => {
      this.connections.forEach(ws => {
        if (!ws['isAlive']) return ws.terminate();
        ws['isAlive'] = false;
        ws.ping();
      });
    }, 30000);
  }

  private subscribeToDeviceUpdates() {
    deviceService.on('device-updated', (device) => {
      this.broadcast({
        type: 'DEVICE_UPDATE',
        data: device
      });
    });

    deviceService.on('device-created', (device) => {
      this.broadcast({
        type: 'DEVICE_CREATED',
        data: device
      });
    });

    deviceService.on('device-deleted', (deviceId) => {
      this.broadcast({
        type: 'DEVICE_DELETED',
        data: { id: deviceId }
      });
    });
  }

  private handleMessage(ws: WebSocket, message: string) {
    try {
      const { type, data } = JSON.parse(message);
      metricsCollector.trackSocketMessage(type);

      switch (type) {
        case 'SUBSCRIBE':
          // Handle subscription requests
          break;
        default:
          console.warn('Unhandled message type:', type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private handleDisconnect(ws: WebSocket) {
    metricsCollector.trackSocketDisconnection();
    this.connections.delete(ws);
  }

  private broadcast(message: object) {
    const payload = JSON.stringify(message);
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  public shutdown() {
    this.wss.close();
    this.connections.clear();
  }
}

export const inventorySocketService = new InventoryWebSocketService();