CREATE TYPE "public"."enrollment_status" AS ENUM('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD COLUMN "status" "enrollment_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD COLUMN "is_experimental" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD COLUMN "denial_reason" text;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_class_enrollments_status" ON "class_enrollments" USING btree ("status");