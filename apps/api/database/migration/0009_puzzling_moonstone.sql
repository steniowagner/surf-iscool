CREATE TABLE "class_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_ratings" ADD CONSTRAINT "class_ratings_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_ratings" ADD CONSTRAINT "class_ratings_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_class_ratings_class_student" ON "class_ratings" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_class_ratings_class_id" ON "class_ratings" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_ratings_student_id" ON "class_ratings" USING btree ("student_id");