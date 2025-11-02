import { ConflictException, Injectable } from '@nestjs/common';

import { TokenGenerationService } from '@shared-modules/security/service/token-generation.service';
import { UnitOfWorkService } from '@shared-modules/persistence/service/unit-of-work.service';
import { DefaultUseCase } from '@src/module/shared/application/default.use-case';
import { HasherService } from '@shared-modules/security/service/hasher.service';
import { ConfigService } from '@shared-modules/config/service/config.service';
import { EmailService } from '@shared-modules/email/service/email.service';
import { generateId } from '@shared-libs/genereate-id';

import { RegisterUsingEmailResponseDto } from '../../http/rest/dto/response/register-using-email.response.dto';
import { RegisterUsingEmailRequestDto } from '../../http/rest/dto/request/register-using-email.request.dto';
import { EmailVerificationRepository } from '../../persistence/repository/email-verification.repository';
import { CredentialEmailPasswordRepository } from '../../persistence/repository/credential-local.repository';
import { AuthProviderRepository } from '../../persistence/repository/auth-provider.repository';
import { EmailPasswordCredentialModel } from '../../core/model/credential-email-password.model';
import { UserRepository } from '../../persistence/repository/user.repository';
import { UserModel } from '../../core/model/user.model';
import {
  EmailVerification,
  Purpose,
  TokenType,
} from '../../core/model/email-verification.model';
import {
  AuthProvider,
  AuthProviderModel,
} from '../../core/model/auth-provider.model';

type CreateEmailVerificationProps = {
  codeHash: string;
  expiresAt: Date;
  userId: string;
};

@Injectable()
export class RegisterUserUsingEmailUseCase extends DefaultUseCase<
  RegisterUsingEmailRequestDto,
  RegisterUsingEmailResponseDto
> {
  constructor(
    private readonly credentialEmailPasswordRepository: CredentialEmailPasswordRepository,
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

  private createUser(
    params: RegisterUsingEmailRequestDto,
    normalizedEmail: string,
  ) {
    const userId = generateId();
    return UserModel.create({
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      email: normalizedEmail,
      id: userId,
    });
  }

  private createAuthProvider(user: UserModel) {
    return AuthProviderModel.create({
      provider: AuthProvider.EmailPassword,
      providerUserId: user.id,
      userId: user.id,
    });
  }

  private createEmailVerification(params: CreateEmailVerificationProps) {
    return EmailVerification.create({
      purpose: Purpose.AccountActivation,
      tokenType: TokenType.Otp,
      tokenHash: params.codeHash,
      expiresAt: params.expiresAt,
      userId: params.userId,
    });
  }

  private async createEmailPasswordCredential(
    userId: string,
    password: string,
  ) {
    const passwordHash = await this.generatePasswordHash(password);
    return EmailPasswordCredentialModel.create({
      userId,
      passwordHash,
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

  async execute(params: RegisterUsingEmailRequestDto) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException({
        message: 'Registration could not be completed.',
      });
    }

    const user = this.createUser(params, normalizedEmail);

    const authProvider = this.createAuthProvider(user);

    const otp = this.generateOtp();

    const emailVerification = this.createEmailVerification({
      codeHash: otp.codeHash,
      expiresAt: otp.expiresAt,
      userId: user.id,
    });

    const credential = await this.createEmailPasswordCredential(
      user.id,
      params.password,
    );

    await this.unitOfWorkService.withTransaction(async (tx) => {
      await this.userRepository.create(user, tx);
      await this.authProviderRepository.create(authProvider, tx);
      await this.credentialEmailPasswordRepository.create(credential, tx);
      await this.emailVerificationRepository.create(emailVerification, tx);
    });

    await this.sendOtpEmail(user, otp.code);

    return {
      activationEmailSent: true,
      expiresAt: otp.expiresAt,
    };
  }
}
