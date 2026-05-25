import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TraccarEventDto {
  @ApiProperty({ example: 12345 })
  @IsNumber()
  deviceId: number;

  @ApiProperty({ example: 'deviceOnline' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 67890 })
  @IsNumber()
  @IsOptional()
  positionId?: number;

  @ApiPropertyOptional({ example: null })
  @IsNumber()
  @IsOptional()
  geofenceId?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serverTime?: string;
}
