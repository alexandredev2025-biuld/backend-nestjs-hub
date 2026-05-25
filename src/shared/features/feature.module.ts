import { Module } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { FeatureGuard } from './feature.guard';

@Module({
  providers: [FeatureService, FeatureGuard],
  exports: [FeatureService, FeatureGuard],
})
export class FeatureModule {}
