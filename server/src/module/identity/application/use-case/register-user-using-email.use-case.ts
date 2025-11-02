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
  EmailVerification,
  Purpose,
  TokenType,
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
    private readonly EmailPasswordCredentialRepository: EmailPasswordCredentialRepository,
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

  private generateOtp() {
    const ttl = this.configService.get('verificationEmailExpirationMinutes');
    const secret = this.configService.get('otpSecret');
    const length = this.configService.get('otpLength');
    return this.tokenGenerationService.generateOtp({
      ttl: ttl * 60 * 1000,
      secret,
      length,
    });
  }

  private async generatePasswordHash(password: string) {
    const pepper = this.configService.get('passwordHashPepper');
    const rounds = this.configService.get('passwordHashRounds');
    return this.hasherService.hash({
      plain: password,
      rounds,
      pepper,
    });
  }

  private createEmailVerification(user: UserModel, otp: OTP) {
    return EmailVerification.create({
      purpose: Purpose.AccountActivation,
      tokenType: TokenType.Otp,
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

  private async resendOtp(user: UserModel, passaword: string) {
    const otp = this.generateOtp();
    const emailVerification = this.createEmailVerification(user, otp);
    const passwordHash = await this.generatePasswordHash(passaword);

    await this.unitOfWorkService.withTransaction(async (tx) => {
      await this.EmailPasswordCredentialRepository.updateHashPassword({
        userId: user.id,
        passwordHash,
        db: tx,
      });
      await this.emailVerificationRepository.markAsUsed(user.id, tx);
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
        existing.status === UserStatus.PendingApproval);
    if (isUserAlreadyActivated) {
      throw new ConflictException({
        message: 'Registration could not be completed.',
      });
    }

    const isUserPendingEmailVerification =
      existing && existing.status === UserStatus.PendingEmailActivation;
    if (isUserPendingEmailVerification) {
      return this.resendOtp(existing, params.password);
    }

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

    const otp = this.generateOtp();
    const emailVerification = this.createEmailVerification(user, otp);

    const passwordHash = await this.generatePasswordHash(params.password);
    const credential = EmailPasswordCredentialModel.create({
      userId,
      passwordHash,
    });

    await this.unitOfWorkService.withTransaction(async (tx) => {
      await this.userRepository.create(user, tx);
      await this.authProviderRepository.create(authProvider, tx);
      await this.EmailPasswordCredentialRepository.create(credential, tx);
      await this.emailVerificationRepository.create(emailVerification, tx);
    });

    await this.sendOtpEmail(user, otp.code);

    return {
      activationEmailSent: true,
      expiresAt: otp.expiresAt,
    };
  }
}
