import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  content!: string;

  @IsUUID()
  clientMessageId!: string;
}
