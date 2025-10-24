CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA "iam";
--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('password', 'google', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'instructor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending_approval', 'active', 'deactivated', 'deleted');--> statement-breakpoint
CREATE TABLE "iam"."auth_providers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_user_id" text NOT NULL,
	"is_email_verified" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"phone" text NOT NULL,
	"avatar_url" text,
	"email" "citext" NOT NULL,
	"password_hash" text,
	"status" "user_status" DEFAULT 'pending_approval' NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "iam"."auth_providers" ADD CONSTRAINT "auth_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auth_providers_per_user" ON "iam"."auth_providers" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auth_providers_identity" ON "iam"."auth_providers" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_providers_user_id" ON "iam"."auth_providers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "iam"."users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "iam"."users" USING btree ("status");