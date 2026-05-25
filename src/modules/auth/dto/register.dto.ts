import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RegisterProduct {
  OTIMIBUS = 'OTIMIBUS',
  FAST_TRACKING = 'FAST_TRACKING',
}

export class RegisterDto {
  @ApiProperty({ example: 'master@otimibus.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Admin Master OtimiBus' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Transportadora ABC' })
  @IsString()
  tenantName: string;

  @ApiProperty({ example: 'transportadora-abc' })
  @IsString()
  tenantSlug: string;

  @ApiProperty({ enum: RegisterProduct, example: RegisterProduct.OTIMIBUS })
  @IsEnum(RegisterProduct)
  product: RegisterProduct;
}
