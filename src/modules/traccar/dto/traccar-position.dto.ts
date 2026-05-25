import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TraccarPositionDto {
  @ApiProperty() id: number;
  @ApiProperty() deviceId: number;
  @ApiProperty() protocol: string;
  @ApiProperty() serverTime: string;
  @ApiProperty() deviceTime: string;
  @ApiProperty() fixTime: string;
  @ApiProperty() valid: boolean;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiPropertyOptional() altitude: number;
  @ApiPropertyOptional() speed: number;
  @ApiPropertyOptional() course: number;
  @ApiPropertyOptional() address: string;
  @ApiPropertyOptional({ type: Object }) attributes: Record<string, any>;
}
