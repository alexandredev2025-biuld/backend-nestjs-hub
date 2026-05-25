import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_OPERATION = 'IN_OPERATION',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC-1A23' })
  @IsString()
  plate: string;

  @ApiPropertyOptional({ example: 'Marcopolo Paradiso' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;
}
