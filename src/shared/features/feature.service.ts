import { Injectable } from '@nestjs/common';
import { Feature } from './feature.enum';

const productFeatures: Record<string, Feature[]> = {
  OTIMIBUS: [
    Feature.ROUTES_MANAGEMENT,
    Feature.SCHEDULES,
    Feature.TICKETING,
    Feature.DRIVER_MANAGEMENT,
    Feature.MAINTENANCE,
    Feature.REPORTS,
  ],
  FAST_TRACKING: [
    Feature.DELIVERY_MANAGEMENT,
    Feature.MAINTENANCE,
    Feature.REPORTS,
  ],
};

@Injectable()
export class FeatureService {
  productHasFeature(product: string, feature: Feature): boolean {
    const features = productFeatures[product];
    if (!features) return false;
    return features.includes(feature);
  }

  getProductFeatures(product: string): Feature[] {
    return productFeatures[product] || [];
  }
}
