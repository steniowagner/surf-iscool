CREATE TABLE "class_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"uploaded_by" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_photos" ADD CONSTRAINT "class_photos_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_photos" ADD CONSTRAINT "class_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_class_photos_class_id" ON "class_photos" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_photos_uploaded_by" ON "class_photos" USING btree ("uploaded_by");