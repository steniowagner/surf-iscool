ALTER TYPE "user_status" ADD VALUE 'DENIED';--> statement-breakpoint
CREATE TABLE "user_role_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"previous_role" "user_role" NOT NULL,
	"new_role" "user_role" NOT NULL,
	"changed_by" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "denied_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "denied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "denial_reason" text;--> statement-breakpoint
ALTER TABLE "user_role_history" ADD CONSTRAINT "user_role_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_history" ADD CONSTRAINT "user_role_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_role_history_user_id" ON "user_role_history" USING btree ("user_id");