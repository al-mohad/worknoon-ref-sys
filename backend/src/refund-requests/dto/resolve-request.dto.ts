import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveRequestDto {
  @IsIn(['APPROVED', 'DENIED'])
  outcome!: 'APPROVED' | 'DENIED';

  @IsString()
  @MinLength(10)
  @MaxLength(1_000)
  note!: string;
}
