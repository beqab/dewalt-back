import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateSliderNumberDto {
  @ApiProperty({
    description: 'Slider group number (1-5) or null to remove from all sliders',
    example: 1,
    enum: [null, 1, 2, 3, 4, 5],
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn([null, 1, 2, 3, 4, 5])
  sliderNumber: number | null;
}
