CREATE TYPE "public"."auth_provider" AS ENUM('EMAIL_PASSWORD', 'FACEBOOK', 'GOOGLE');--> statement-breakpoint
CREATE TYPE "public"."purpose" AS ENUM('ACCOUNT_ACTIVATION', 'PASSWORD_RESET');--> statement-breakpoint
CREATE TYPE "public"."token_type" AS ENUM('OTP');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('STUDENT', 'INSTRUCTOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING_EMAIL_ACTIVATION', 'PENDING_PROFILE_INFORMATION', 'PENDING_APPROVAL', 'ACTIVE', 'DEACTIVATED', 'DELETED');--> statement-breakpoint
CREATE TABLE "auth_providers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_user_id" text NOT NULL,
	"is_email_verified" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials_email_password" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"token_type" "token_type" NOT NULL,
	"purpose" "purpose" NOT NULL,
	"attempts" numeric NOT NULL,
	"max_attempts" numeric NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"phone" text NOT NULL,
	"avatar_url" text,
	"email" text NOT NULL,
	"status" "user_status" NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials_email_password" ADD CONSTRAINT "credentials_email_password_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auth_providers_per_user" ON "auth_providers" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auth_providers_identity" ON "auth_providers" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_providers_user_id" ON "auth_providers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");