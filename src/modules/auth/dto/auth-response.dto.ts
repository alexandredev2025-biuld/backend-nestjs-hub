import { ApiProperty } from '@nestjs/swagger';

class UserInfo {
  @ApiProperty({ example: '978b9a7f-a729-4e97-8241-a863dcc556d8' })
  id: string;

  @ApiProperty({ example: 'master@otimibus.com' })
  email: string;

  @ApiProperty({ example: 'Admin Master OtimiBus' })
  name: string;

  @ApiProperty({ example: 'MASTER' })
  role: string;

  @ApiProperty({ example: 'ff29ae6c-7696-4d63-bc51-67b0b968adc1' })
  tenantId: string;

  @ApiProperty({ example: 'OTIMIBUS' })
  product: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ type: UserInfo })
  user: UserInfo;
}
