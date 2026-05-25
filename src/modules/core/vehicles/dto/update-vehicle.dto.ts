import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_OPERATION = 'IN_OPERATION',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

export class UpdateVehicleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  plate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;
}
