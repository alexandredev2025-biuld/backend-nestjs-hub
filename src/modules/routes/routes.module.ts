import { Module } from '@nestjs/common';
import { FeatureModule } from '../../shared/features/feature.module';
import { RoutesController } from './routes.controller';

@Module({
  imports: [FeatureModule],
  controllers: [RoutesController],
})
export class RoutesModule {}
