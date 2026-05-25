import { ApiProperty } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() plate: string;
  @ApiProperty() model: string;
  @ApiProperty() status: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
