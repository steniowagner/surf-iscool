import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignInstructorRequestDto {
  @IsNotEmpty()
  @IsUUID()
  instructorId!: string;
}
