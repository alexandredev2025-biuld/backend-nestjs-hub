import { Module } from '@nestjs/common';
import { TraccarController } from './traccar.controller';
import { TraccarService } from './traccar.service';
import { TraccarGateway } from './traccar.gateway';
import { TraccarSocketClient } from './traccar.client';

@Module({
  controllers: [TraccarController],
  providers: [TraccarService, TraccarGateway, TraccarSocketClient],
  exports: [TraccarGateway],
})
export class TraccarModule {}
