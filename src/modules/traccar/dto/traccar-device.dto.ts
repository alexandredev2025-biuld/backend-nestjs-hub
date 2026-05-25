import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TraccarDeviceDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() uniqueId: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() disabled: boolean;
  @ApiPropertyOptional() phone: string;
  @ApiPropertyOptional() model: string;
  @ApiPropertyOptional() category: string;
  @ApiPropertyOptional() lastUpdate: string;
  @ApiPropertyOptional({ type: Object }) attributes: Record<string, any>;
}
