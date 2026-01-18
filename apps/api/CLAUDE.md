# API - CLAUDE.md

NestJS 11 backend with Supabase (Auth + PostgreSQL via Drizzle ORM).

## Commands

```bash
npm run start:dev               # Start in watch mode
npm run test                    # Run unit tests (Jest)
npm run test:watch              # Run tests in watch mode
npm run test:e2e                # Run E2E tests with testcontainers
npm run db:generate:dev         # Generate Drizzle migrations
npm run db:migrate:dev          # Apply Drizzle migrations
npm run format                  # Format with Prettier
```

## Path Aliases

```
@src/*           → ./src/*
@shared-libs/*   → ./src/module/shared/lib/*
@shared-modules/* → ./src/module/shared/module/*
@shared-core/*   → ./src/module/shared/core/*
```

## Module Organization

```
module/<feature>/
├── core/
│   ├── model/          # Domain models extending DefaultModel
│   └── services/       # Business logic services
├── persistence/
│   └── repository/     # Drizzle repositories extending DefaultRepository
├── http/rest/
│   ├── controller/     # HTTP controllers
│   └── dto/
│       ├── request/    # Request DTOs with class-validator
│       └── response/   # Response DTOs
└── <feature>.module.ts
```

Shared modules in `module/shared/`:
- **module/config**: Zod-validated environment configuration
- **module/auth**: Supabase authentication with Passport strategy
- **module/persistence**: Drizzle connection and DefaultRepository
- **module/logger**: Winston logging via nest-winston
- **lib/**: Utility functions (`is-email-valid`, `load-env`)
- **core/**: Base classes and exceptions

## Code Patterns

### Domain Model
```typescript
import { DefaultModel, WithOptional } from '@shared-core/model/default.model';

export class UserModel extends DefaultModel {
  readonly email!: string;
  readonly status!: UserStatus;
  readonly role!: UserRole;

  static create(data: WithOptional<UserModel, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) {
    return Object.assign(new UserModel(), {
      id: data.id ?? randomUUID(),
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      deletedAt: data.deletedAt ?? null,
      ...data,
    });
  }

  static createFrom(data: UserModel) {
    return Object.assign(new UserModel(), data);
  }
}
```

### Repository
```typescript
@Injectable()
export class UserRepository extends DefaultRepository<UserModel, typeof usersTable> {
  constructor(
    @Inject(DATABASE) protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, usersTable, logger);
  }

  protected mapToModel(data: InferSelectModel<typeof usersTable>): UserModel {
    return UserModel.createFrom(data);
  }

  // Custom methods receive optional `db` parameter for transaction support
  async updateStatus({ id, db = this.db, status }: UpdateStatusParams) {
    // ...
  }
}
```

### Service
```typescript
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new DomainException('User not found');
    }
    return user;
  }
}
```

### Controller
```typescript
@Controller('auth')
@UseGuards(AuthGuard, RolesGuard)
export class AuthController {
  @Get('me')
  getMyProfile(@CurrentUser() user: UserModel): GetMyProfileResponseDto {
    return { profile: user };
  }

  @Post('action')
  @Roles(UserRole.Admin)  // Restrict to admin users
  async adminAction(@Body() body?: SomeDto) {
    // Use optional chaining for optional body: body?.field
  }
}
```

### Error Handling
- **DomainException**: Business logic errors (400 Bad Request)
- **PersistenceClientException**: Database constraint violations (400)
- **PersistenceInternalException**: Database operation failures (500)
- PostgreSQL error codes: 23505 (unique), 23503 (foreign key), 23502 (not-null)

## Supabase Authentication

### Auth Service
```typescript
@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient(
      configService.get('supabaseUrl'),
      configService.get('supabaseServiceRoleKey'),
    );
  }

  get supabase(): SupabaseClient {
    return this.client;
  }
}
```

### Auth Strategy
```typescript
async validate(req: Request) {
  const token = extractBearerToken(req);

  const { data: { user }, error } = await this.supabaseAuthService
    .supabase
    .auth
    .getUser(token);

  if (error || !user) {
    throw new UnauthorizedException('Invalid token');
  }

  return await this.authService.validateUser(user.id, user.email!);
}
```

## E2E Testing Patterns

### Basic Structure
```typescript
import { TestDb } from '../utils';
import { Tables } from '../enum/tables.enum';
import { makeUser, makeSupabaseUser } from '../factory';

describe('feature/routes/endpoint', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users]);
    await testDbClient.init();
  });

  afterEach(async () => {
    await testDbClient.clean();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
    await testDbClient.destroy();
  });
});
```

### Supabase Auth Mocking
```typescript
.overrideProvider(SupabaseAuthService)
.useValue({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: makeSupabaseUser({ id: user.id, email: user.email }),
        },
        error: null,
      }),
    },
  },
})
```

### Test Factories
```typescript
export const makeUser = (overrides?: Partial<UserModel>) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  status: UserStatus.PendingApproval,
  role: UserRole.Student,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

export const makeSupabaseUser = (overrides: { id?: string; email?: string } = {}) => ({
  id: overrides.id ?? faker.string.uuid(),
  email: overrides.email ?? faker.internet.email(),
  email_confirmed_at: new Date().toISOString(),
  user_metadata: {},
});
```

## Import Organization

1. NestJS/framework imports
2. Third-party packages
3. `@surf-iscool/*` workspace packages
4. `@shared-*` path aliases
5. `@src/*` path aliases
6. Relative imports

## Naming Conventions

- **Files**: kebab-case (`user.service.ts`, `admin-users.controller.ts`)
- **Classes**: PascalCase with suffix (`UserService`, `UserRepository`, `UserModel`)
- **DTOs**: `<action>-<resource>.<type>.dto.ts` (`get-my-profile.response.dto.ts`)
- **Tables enum**: snake_case matching database (`Tables.Users` → `'users'`)

## Environment Variables

```
PORT
DATABASE_HOST
DATABASE_PORT
DATABASE_USERNAME
DATABASE_PASSWORD
DATABASE_NAME
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Key Notes

- Always use `body?.field` for optional request bodies in controllers
- Knex in tests auto-converts camelCase to snake_case via `wrapIdentifier`
- TestDb uses Knex for direct database access (separate from Drizzle in app)
- Soft delete uses `deletedAt` timestamp (null = active)
- User approval flow: PendingProfileInformation → PendingApproval → Approved/Denied
- Database connects to Supabase PostgreSQL using standard PostgreSQL credentials
