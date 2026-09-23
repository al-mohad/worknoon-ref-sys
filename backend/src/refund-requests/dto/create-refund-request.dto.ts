import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  message?: string;
}
