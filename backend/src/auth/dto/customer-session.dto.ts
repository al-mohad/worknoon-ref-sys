import { IsEmail } from 'class-validator';

export class CustomerSessionDto {
  @IsEmail()
  email!: string;
}
