PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_bookmarks` (
	`user_id` text NOT NULL,
	`gig_id` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	PRIMARY KEY(`user_id`, `gig_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gig_id`) REFERENCES `gigs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_bookmarks`("user_id", "gig_id", "created_at", "updated_at") SELECT "user_id", "gig_id", "created_at", "updated_at" FROM `user_bookmarks`;--> statement-breakpoint
DROP TABLE `user_bookmarks`;--> statement-breakpoint
ALTER TABLE `__new_user_bookmarks` RENAME TO `user_bookmarks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_user_gigs` (
	`user_id` text NOT NULL,
	`gig_id` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`status` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `gig_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gig_id`) REFERENCES `gigs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_gigs`("user_id", "gig_id", "created_at", "updated_at", "status") SELECT "user_id", "gig_id", "created_at", "updated_at", "status" FROM `user_gigs`;--> statement-breakpoint
DROP TABLE `user_gigs`;--> statement-breakpoint
ALTER TABLE `__new_user_gigs` RENAME TO `user_gigs`;