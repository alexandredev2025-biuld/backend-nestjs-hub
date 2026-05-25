import { SetMetadata } from '@nestjs/common';
import { Feature } from './feature.enum';

export const FEATURES_KEY = 'features';
export const RequiresFeature = (...features: Feature[]) =>
  SetMetadata(FEATURES_KEY, features);
