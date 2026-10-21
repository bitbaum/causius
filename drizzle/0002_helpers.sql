CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"helper_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sealed_key" text NOT NULL,
	"sealed_evidence" text NOT NULL,
	"sealed_disclosures" text,
	"token" text,
	"review_note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by_sub" text,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"matter_id" uuid NOT NULL,
	"helper_id" uuid NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"sees" text DEFAULT 'anonymised' NOT NULL,
	"sealed_request" text NOT NULL,
	"sealed_disclosure" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "helpers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sub" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"jurisdictions" text[] DEFAULT '{}'::text[] NOT NULL,
	"areas" text[] DEFAULT '{}'::text[] NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"service_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "sees" text DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_helper_id_helpers_id_fk" FOREIGN KEY ("helper_id") REFERENCES "public"."helpers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_helper_id_helpers_id_fk" FOREIGN KEY ("helper_id") REFERENCES "public"."helpers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credentials_helper_idx" ON "credentials" USING btree ("helper_id");--> statement-breakpoint
CREATE INDEX "credentials_status_idx" ON "credentials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "engagements_matter_idx" ON "engagements" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "engagements_helper_idx" ON "engagements" USING btree ("helper_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "engagements_open_idx" ON "engagements" USING btree ("matter_id","helper_id") WHERE status in ('requested', 'accepted');--> statement-breakpoint
CREATE UNIQUE INDEX "helpers_sub_idx" ON "helpers" USING btree ("sub");--> statement-breakpoint
CREATE INDEX "helpers_status_idx" ON "helpers" USING btree ("status","kind");