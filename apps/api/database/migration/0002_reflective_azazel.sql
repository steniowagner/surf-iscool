CREATE TYPE "public"."class_status" AS ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."discipline" AS ENUM('SURF', 'SKATE');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('BEGINNER', 'ADVANCED', 'EXPERT');--> statement-breakpoint
CREATE TABLE "class_instructors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"instructor_id" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipline" "discipline" NOT NULL,
	"skill_level" "skill_level" NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"location" text NOT NULL,
	"max_capacity" integer NOT NULL,
	"status" "class_status" DEFAULT 'SCHEDULED' NOT NULL,
	"cancellation_reason" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_class_instructors_class_instructor" ON "class_instructors" USING btree ("class_id","instructor_id");--> statement-breakpoint
CREATE INDEX "idx_class_instructors_class_id" ON "class_instructors" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_instructors_instructor_id" ON "class_instructors" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_classes_status" ON "classes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_classes_scheduled_at" ON "classes" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_classes_discipline" ON "classes" USING btree ("discipline");