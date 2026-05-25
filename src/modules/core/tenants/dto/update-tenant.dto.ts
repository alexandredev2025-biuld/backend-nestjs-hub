import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum Product {
  OTIMIBUS = 'OTIMIBUS',
  FAST_TRACKING = 'FAST_TRACKING',
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: Product })
  @IsEnum(Product)
  @IsOptional()
  product?: Product;
}
