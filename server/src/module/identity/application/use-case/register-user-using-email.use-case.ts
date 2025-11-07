import { ConflictException, Injectable } from '@nestjs/common';

import { TokenGenerationService } from '@shared-modules/security/service/token-generation.service';
import { UnitOfWorkService } from '@shared-modules/persistence/service/unit-of-work.service';
import { DefaultUseCase } from '@src/module/shared/application/default.use-case';
import { HasherService } from '@shared-modules/security/service/hasher.service';
import { ConfigService } from '@shared-modules/config/service/config.service';
import { EmailService } from '@shared-modules/email/service/email.service';
import { generateId } from '@shared-libs/genereate-id';
import { OTP } from '@shared-modules/security/types';

import { RegisterUsingEmailResponseDto } from '../../http/rest/dto/response/register-using-email.response.dto';
import { RegisterUsingEmailRequestDto } from '../../http/rest/dto/request/register-using-email.request.dto';
import { EmailVerificationRepository } from '../../persistence/repository/email-verification.repository';
import { EmailPasswordCredentialRepository } from '../../persistence/repository/email-password-credential.repository';
import { AuthProviderRepository } from '../../persistence/repository/auth-provider.repository';
import { EmailPasswordCredentialModel } from '../../core/model/email-password-credential.model';
import { UserRepository } from '../../persistence/repository/user.repository';
import { UserModel, UserStatus } from '../../core/model/user.model';
import {
  EmailVerificationModel,
  EmailVerificationPurpose,
  EmailVerificationTokenType,
} from '../../core/model/email-verification.model';
import {
  AuthProvider,
  AuthProviderModel,
} from '../../core/model/auth-provider.model';

@Injectable()
export class RegisterUserUsingEmailUseCase extends DefaultUseCase<
  RegisterUsingEmailRequestDto,
  RegisterUsingEmailResponseDto
> {
  constructor(
    private readonly emailPasswordCredentialRepository: EmailPasswordCredentialRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly authProviderRepository: AuthProviderRepository,
    private readonly tokenGenerationService: TokenGenerationService,
    private readonly userRepository: UserRepository,
    private readonly hasherService: HasherService,
    private readonly configService: ConfigService,
    private readonly unitOfWorkService: UnitOfWorkService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  private createEmailVerification(user: UserModel, otp: OTP) {
    return EmailVerificationModel.create({
      purpose: EmailVerificationPurpose.AccountActivation,
      tokenType: EmailVerificationTokenType.Otp,
      tokenHash: otp.codeHash,
      expiresAt: otp.expiresAt,
      userId: user.id,
    });
  }

  private async sendOtpEmail(user: UserModel, code: string) {
    await this.emailService.send({
      userEmail: user.email,
      template: 'ACTIVATE_EMAIL_OTP',
      templateParams: {
        codeTtl: `${this.configService.get('verificationEmailExpirationMinutes')} minutos`,
        userName: user.firstName,
        code,
      },
    });
  }

  private async resendOtp(user: UserModel) {
    const otpScope = `${user.email}:${EmailVerificationPurpose.AccountActivation}`;
    const otp = this.tokenGenerationService.generateOtp(otpScope);
    const emailVerification = this.createEmailVerification(user, otp);

    await this.unitOfWorkService.withTransaction(async (tx) => {
      await this.emailVerificationRepository.invalidateAllActive({
        purpose: EmailVerificationPurpose.AccountActivation,
        userId: user.id,
        db: tx,
      });
      await this.emailVerificationRepository.create(emailVerification, tx);
    });

    await this.sendOtpEmail(user, otp.code);

    return {
      activationEmailSent: true,
      expiresAt: otp.expiresAt,
    };
  }

  async execute(params: RegisterUsingEmailRequestDto) {
    const normalizedEmail = params.email.trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    const isUserAlreadyActivated =
      existing &&
      (existing.status === UserStatus.Active ||
        existing.status === UserStatus.PendingApproval ||
        existing.status === UserStatus.PendingProfileInformation);
    if (isUserAlreadyActivated)
      throw new ConflictException({
        message: 'Registration could not be completed.',
      });

    const isUserPendingEmailVerification =
      existing && existing.status === UserStatus.PendingEmailActivation;
    if (isUserPendingEmailVerification) return this.resendOtp(existing);

    const userId = generateId();
    const user = UserModel.create({
      status: UserStatus.PendingEmailActivation,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      email: normalizedEmail,
      id: userId,
    });

    const authProvider = AuthProviderModel.create({
      provider: AuthProvider.EmailPassword,
      providerUserId: user.id,
      userId: user.id,
    });

    const otpScope = `${user.email}:${EmailVerificationPurpose.AccountActivation}`;
    const otp = this.tokenGenerationService.generateOtp(otpScope);
    const emailVerification = this.createEmailVerification(user, otp);

    const passwordHash = await this.hasherService.hash(params.password);
    const credential = EmailPasswordCredentialModel.create({
      userId,
      passwordHash,
    });

    await this.unitOfWorkService.withTransaction(async (tx) => {
      await this.userRepository.create(user, tx);
      await this.authProviderRepository.create(authProvider, tx);
      await this.emailPasswordCredentialRepository.create(credential, tx);
      await this.emailVerificationRepository.create(emailVerification, tx);
    });

    await this.sendOtpEmail(user, otp.code);

    return {
      activationEmailSent: true,
      expiresAt: otp.expiresAt,
    };
  }
}
