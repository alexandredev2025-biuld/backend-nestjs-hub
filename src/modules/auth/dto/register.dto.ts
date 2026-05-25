import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

export enum RegisterProduct {
  OTIMIBUS = 'OTIMIBUS',
  FAST_TRACKING = 'FAST_TRACKING',
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  tenantName: string;

  @IsString()
  tenantSlug: string;

  @IsEnum(RegisterProduct)
  product: RegisterProduct;
}
