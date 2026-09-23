import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminListQueryDto {
  @IsOptional()
  @IsIn(['collecting_info', 'awaiting_review', 'resolved'])
  status?: 'collecting_info' | 'awaiting_review' | 'resolved';

  @IsOptional()
  @IsIn(['APPROVED', 'DENIED', 'ESCALATED'])
  outcome?: 'APPROVED' | 'DENIED' | 'ESCALATED';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  flagged?: boolean;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @IsOptional()
  @IsString()
  cursor?: string;
}
