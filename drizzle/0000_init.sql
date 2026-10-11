CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"matter_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sealed" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by_sub" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"matter_id" uuid NOT NULL,
	"sealed_meta" text NOT NULL,
	"sealed_text" text NOT NULL,
	"size" integer NOT NULL,
	"created_by_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"matter_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"actor" text NOT NULL,
	"sealed" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"matter_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"due" date,
	"status" text DEFAULT 'open' NOT NULL,
	"sealed" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_sub" text NOT NULL,
	"sealed_key" text NOT NULL,
	"sealed" text NOT NULL,
	"jurisdiction" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"matter_id" uuid NOT NULL,
	"sub" text NOT NULL,
	"role" text NOT NULL,
	"alias" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_matter_id_sub_pk" PRIMARY KEY("matter_id","sub")
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_matter_idx" ON "approvals" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "documents_matter_idx" ON "documents" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "events_matter_idx" ON "events" USING btree ("matter_id","id");--> statement-breakpoint
CREATE INDEX "items_matter_idx" ON "items" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "items_due_idx" ON "items" USING btree ("due");--> statement-breakpoint
CREATE INDEX "matters_owner_idx" ON "matters" USING btree ("owner_sub");--> statement-breakpoint
CREATE INDEX "participants_sub_idx" ON "participants" USING btree ("sub");