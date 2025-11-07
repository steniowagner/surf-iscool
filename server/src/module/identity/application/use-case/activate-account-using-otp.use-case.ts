import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isAfter } from 'date-fns';

import { TokenGenerationService } from '@shared-modules/security/service/token-generation.service';
import { UnitOfWorkService } from '@shared-modules/persistence/service/unit-of-work.service';
import { DefaultUseCase } from '@src/module/shared/application/default.use-case';
import { ConfigService } from '@shared-modules/config/service/config.service';

import { ActivateAccountUsingOtpRequestDto } from '../../http/rest/dto/request/activate-account-using-otp.request.dto';
import { ActivateAccountUsingOtpResponseDto } from '../../http/rest/dto/response/activate-account-using-otp.response.dto';
import { EmailVerificationRepository } from '../../persistence/repository/email-verification.repository';
import { AuthProviderRepository } from '../../persistence/repository/auth-provider.repository';
import { UserRepository } from '../../persistence/repository/user.repository';
import { UserStatus } from '../../core/model/user.model';
import {
  EmailVerificationModel,
  EmailVerificationPurpose,
} from '../../core/model/email-verification.model';

@Injectable()
export class ActivateAccountUsingOtpUseCase extends DefaultUseCase<
  ActivateAccountUsingOtpRequestDto,
  ActivateAccountUsingOtpResponseDto
> {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly userRepository: UserRepository,
    private readonly authProvidersRepository: AuthProviderRepository,
    private readonly tokenGenerationService: TokenGenerationService,
    private readonly unitOfWorkService: UnitOfWorkService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  private async handleUsingWrongOtp(emailVerification: EmailVerificationModel) {
    const emailVerificationUpdated =
      await this.emailVerificationRepository.updateAttempts({
        attempts: emailVerification.attempts + 1,
        id: emailVerification.id,
      });

    const maxAttempts = this.configService.get('verificationEmailMaxAttempts');
    if (emailVerificationUpdated!.attempts >= maxAttempts) {
      await this.emailVerificationRepository.invalidate({
        isInvalidatingByExceedingMaxAttempts: true,
        emailVerification,
      });
      throw new BadRequestException(
        'Maximum attempts reached. Request a new code.',
      );
    }

    throw new BadRequestException('Invalid code.');
  }

  async execute(
    params: ActivateAccountUsingOtpRequestDto,
  ): Promise<ActivateAccountUsingOtpResponseDto> {
    const normalizedEmail = params.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isUserAlreadyActivated =
      user.status === UserStatus.Active ||
      user.status === UserStatus.PendingApproval ||
      user.status === UserStatus.PendingProfileInformation;
    if (isUserAlreadyActivated) {
      throw new ConflictException('User already active');
    }
    const emailVerification =
      await this.emailVerificationRepository.findActiveByUserAndPurpose({
        purpose: EmailVerificationPurpose.AccountActivation,
        userId: user.id,
      });
    if (!emailVerification) {
      throw new NotFoundException('No active Email-verification not found');
    }

    const maxAttempts = this.configService.get('verificationEmailMaxAttempts');
    if (emailVerification.attempts >= maxAttempts) {
      throw new BadRequestException(
        'Maximum attempts reached. Request a new code.',
      );
    }

    const now = new Date();
    const isExpired = isAfter(now, emailVerification.expiresAt);
    if (isExpired) {
      throw new GoneException(
        'This code is expired. Please request a new code.',
      );
    }

    const isMatchingOtp = this.tokenGenerationService.compareOtp({
      inputCode: params.code,
      storedHash: emailVerification.tokenHash,
      scope: `${user.email}:${emailVerification.purpose}`,
    });
    if (!isMatchingOtp) {
      await this.handleUsingWrongOtp(emailVerification);
    }

    await this.unitOfWorkService.withTransaction(async (tx) => {
      await this.emailVerificationRepository.invalidate({
        emailVerification,
        db: tx,
      });
      await this.authProvidersRepository.verifyEmail(user.id, tx);
      await this.userRepository.updateStatus({
        status: UserStatus.PendingProfileInformation,
        id: user.id,
        db: tx,
      });
    });

    return { activated: true };
  }
}
