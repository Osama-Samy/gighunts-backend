CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT true NOT NULL,
	`image` text,
	`dark_mode` integer DEFAULT false,
	`app_notifications` integer DEFAULT true,
	`email_notifications` integer DEFAULT true,
	`language` text DEFAULT 'en',
	`in_app_browser` integer DEFAULT true,
	`platform_filters` text DEFAULT '[]',
	`phone` text,
	`cv` text,
	`cv_link` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`description` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gig_skills` (
	`gig_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	PRIMARY KEY(`gig_id`, `skill_id`),
	FOREIGN KEY (`gig_id`) REFERENCES `gigs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gigs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text,
	`price` real,
	`duration` text,
	`type` integer,
	`creation_time` integer DEFAULT (strftime('%s', 'now')),
	`platform_id` integer,
	`category` text,
	`language` text,
	FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`context` text,
	`url` text,
	`method` text,
	`request` text,
	`query` text,
	`data` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platforms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`image_url` text,
	`description` text,
	`platform_url` text,
	`youtube_url` text,
	`video_url` text
);
--> statement-breakpoint
CREATE TABLE `skill_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_categories_name_unique` ON `skill_categories` (`name`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer,
	FOREIGN KEY (`category_id`) REFERENCES `skill_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_bookmarks` (
	`user_id` integer NOT NULL,
	`gig_id` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`user_id`, `gig_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gig_id`) REFERENCES `gigs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_gigs` (
	`user_id` integer NOT NULL,
	`gig_id` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`status` integer DEFAULT 1,
	PRIMARY KEY(`user_id`, `gig_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gig_id`) REFERENCES `gigs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_platform_ratings` (
	`user_id` integer NOT NULL,
	`platform_id` integer NOT NULL,
	`success_rate` real,
	`free_proposals` integer DEFAULT 0,
	PRIMARY KEY(`user_id`, `platform_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_skills` (
	`user_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `skill_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
