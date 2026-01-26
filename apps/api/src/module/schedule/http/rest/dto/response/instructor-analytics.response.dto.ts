type InstructorClassStats = {
  instructorId: string;
  classCount: number;
};

export class InstructorAnalyticsResponseDto {
  totalAssignments!: number;
  uniqueInstructorsWithClasses!: number;
  classesPerInstructor!: InstructorClassStats[];
}
