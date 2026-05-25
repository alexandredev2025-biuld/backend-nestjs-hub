import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/realtime',
})
export class TraccarGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TraccarGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Frontend conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Frontend desconectado: ${client.id}`);
  }

  broadcastPosition(data: any) {
    this.server.emit('position', data);
  }

  broadcastEvent(data: any) {
    this.server.emit('event', data);
  }

  broadcastDeviceStatus(data: any) {
    this.server.emit('device:status', data);
  }
}
