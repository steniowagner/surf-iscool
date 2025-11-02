import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { isEmailValid } from '@shared-libs/is-email-valid';

import { RegisterUserUsingEmailUseCase } from '../../../application/use-case/register-user-using-email.use-case';
import { RegisterUsingEmailRequestDto } from '../dto/request/register-using-email.request.dto';
import { RegisterUsingEmailResponseDto } from '../dto/response/register-using-email.response.dto';

@Controller('auth/email')
export class AuthEmailController {
  constructor(
    private readonly registerUserUsingEmailUseCase: RegisterUserUsingEmailUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerRequest: RegisterUsingEmailRequestDto,
  ): Promise<RegisterUsingEmailResponseDto> {
    if (!isEmailValid(registerRequest.email)) {
      throw new BadRequestException(`Invalid email: ${registerRequest.email}`);
    }
    return await this.registerUserUsingEmailUseCase.execute(registerRequest);
  }
}
