import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURES_KEY } from './feature.decorator';
import { FeatureService } from './feature.service';
import { Feature } from './feature.enum';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureService: FeatureService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeatures = this.reflector.getAllAndOverride<Feature[]>(FEATURES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredFeatures?.length) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user?.product) {
      throw new ForbiddenException('Produto não identificado');
    }

    for (const feature of requiredFeatures) {
      if (!this.featureService.productHasFeature(user.product, feature)) {
        throw new ForbiddenException(
          `Funcionalidade '${feature}' não disponível para o produto ${user.product}`,
        );
      }
    }

    return true;
  }
}
