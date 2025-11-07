import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { ActivateAccountUsingOtpUseCase } from '@src/module/identity/application/use-case/activate-account-using-otp.use-case';
import { isEmailValid } from '@shared-libs/is-email-valid';

import { RegisterUserUsingEmailUseCase } from '../../../application/use-case/register-user-using-email.use-case';
import { RegisterUsingEmailRequestDto } from '../dto/request/register-using-email.request.dto';
import { RegisterUsingEmailResponseDto } from '../dto/response/register-using-email.response.dto';
import { ActivateAccountUsingOtpRequestDto } from '../dto/request/activate-account-using-otp.request.dto';
import { ActivateAccountUsingOtpResponseDto } from '../dto/response/activate-account-using-otp.response.dto';

@Controller('auth/email')
export class AuthEmailController {
  constructor(
    private readonly registerUserUsingEmailUseCase: RegisterUserUsingEmailUseCase,
    private readonly activateAccountUsingOtpUseCase: ActivateAccountUsingOtpUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() request: RegisterUsingEmailRequestDto,
  ): Promise<RegisterUsingEmailResponseDto> {
    if (!isEmailValid(request.email)) {
      throw new BadRequestException(`Invalid email: ${request.email}`);
    }
    return await this.registerUserUsingEmailUseCase.execute(request);
  }

  @Post('/activate/otp')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Body() request: ActivateAccountUsingOtpRequestDto,
  ): Promise<ActivateAccountUsingOtpResponseDto> {
    return await this.activateAccountUsingOtpUseCase.execute(request);
  }
}
