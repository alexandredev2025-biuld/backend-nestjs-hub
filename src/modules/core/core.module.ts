import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TraccarModule } from '../traccar/traccar.module';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';

@Module({
  imports: [AuthModule, TraccarModule],
  controllers: [TenantsController, VehiclesController],
  providers: [TenantsService, VehiclesService],
})
export class CoreModule {}
