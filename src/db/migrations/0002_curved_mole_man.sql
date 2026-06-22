PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "user_id", "action", "entity", "entity_id", "details", "ip", "created_at") SELECT "id", "user_id", "action", "entity", "entity_id", "details", "ip", "created_at" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_user_bookmarks` (
	`user_id` text NOT NULL,
	`gig_id` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`user_id`, `gig_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gig_id`) REFERENCES `gigs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_bookmarks`("user_id", "gig_id", "created_at", "updated_at") SELECT "user_id", "gig_id", "created_at", "updated_at" FROM `user_bookmarks`;--> statement-breakpoint
DROP TABLE `user_bookmarks`;--> statement-breakpoint
ALTER TABLE `__new_user_bookmarks` RENAME TO `user_bookmarks`;--> statement-breakpoint
CREATE TABLE `__new_user_gigs` (
	`user_id` text NOT NULL,
	`gig_id` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`status` integer DEFAULT 1,
	PRIMARY KEY(`user_id`, `gig_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gig_id`) REFERENCES `gigs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_gigs`("user_id", "gig_id", "created_at", "updated_at", "status") SELECT "user_id", "gig_id", "created_at", "updated_at", "status" FROM `user_gigs`;--> statement-breakpoint
DROP TABLE `user_gigs`;--> statement-breakpoint
ALTER TABLE `__new_user_gigs` RENAME TO `user_gigs`;--> statement-breakpoint
CREATE TABLE `__new_user_platform_ratings` (
	`user_id` text NOT NULL,
	`platform_id` integer NOT NULL,
	`success_rate` real,
	`free_proposals` integer DEFAULT 0,
	PRIMARY KEY(`user_id`, `platform_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_platform_ratings`("user_id", "platform_id", "success_rate", "free_proposals") SELECT "user_id", "platform_id", "success_rate", "free_proposals" FROM `user_platform_ratings`;--> statement-breakpoint
DROP TABLE `user_platform_ratings`;--> statement-breakpoint
ALTER TABLE `__new_user_platform_ratings` RENAME TO `user_platform_ratings`;--> statement-breakpoint
CREATE TABLE `__new_user_skills` (
	`user_id` text NOT NULL,
	`skill_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `skill_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_skills`("user_id", "skill_id") SELECT "user_id", "skill_id" FROM `user_skills`;--> statement-breakpoint
DROP TABLE `user_skills`;--> statement-breakpoint
ALTER TABLE `__new_user_skills` RENAME TO `user_skills`;