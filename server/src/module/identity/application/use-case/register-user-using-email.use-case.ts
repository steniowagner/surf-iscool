import { ConflictException, Injectable } from '@nestjs/common';

import { TokenGenerationService } from '@shared-modules/security/service/token-generation.service';
import { UnitOfWorkService } from '@shared-modules/persistence/service/unit-of-work.service';
import { DefaultUseCase } from '@src/module/shared/application/default.use-case';
import { HasherService } from '@shared-modules/security/service/hasher.service';
import { ConfigService } from '@shared-modules/config/service/config.service';
import { generateId } from '@shared-libs/genereate-id';

import { RegisterUsingEmailResponseDto } from '../../http/rest/dto/response/register-using-email.response.dto';
import { RegisterUsingEmailRequestDto } from '../../http/rest/dto/request/register-using-email.request.dto';
import { EmailVerificationRepository } from '../../persistence/repository/email-verification.repository';
import { CredentialLocalRepository } from '../../persistence/repository/credential-local.repository';
import { AuthProviderRepository } from '../../persistence/repository/auth-provider.repository';
import { CredentialLocalModel } from '../../core/model/credential-local.model';
import { UserRepository } from '../../persistence/repository/user.repository';
import { EmailVerification } from '../../core/model/email-verification.model';
import { UserModel } from '../../core/model/user.model';
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
    private readonly credentialLocalRepository: CredentialLocalRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly authProviderRepository: AuthProviderRepository,
    private readonly tokenGenerationService: TokenGenerationService,
    private readonly userRepository: UserRepository,
    private readonly hasherService: HasherService,
    private readonly configService: ConfigService,
    private readonly unitOfWorkService: UnitOfWorkService,
  ) {
    super();
  }

  async execute(params: RegisterUsingEmailRequestDto) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException({
        message: 'Registration could not be completed.',
      });
    }

    const userId = generateId();
    const user = UserModel.create({
      ...params,
      email: normalizedEmail,
      id: userId,
    });

    const authProvider = AuthProviderModel.create({
      userId,
      provider: AuthProvider.Password,
      providerUserId: userId,
    });

    const passwordHash = await this.hasherService.hash(
      params.password,
      this.configService.get('passwordHashSalt'),
    );
    const credentialLocal = CredentialLocalModel.create({
      userId,
      passwordHash,
    });

    const rawToken = this.tokenGenerationService.randomUrlSafe();
    const tokenHash = this.tokenGenerationService.sha256Hex(rawToken);
    const emailVerification = EmailVerification.create({
      userId,
      tokenHash,
    });

    await this.unitOfWorkService.withTransaction(async (tx) => {
      await this.userRepository.create(user, tx);
      await this.authProviderRepository.create(authProvider, tx);
      await this.credentialLocalRepository.create(credentialLocal, tx);
      await this.emailVerificationRepository.create(emailVerification, tx);
    });

    return {
      emailVerification: {
        sent: true,
        expiresAt: emailVerification.expiresAt,
      },
    };
  }
}
