PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT true NOT NULL,
	`image` text,
	`is_active` integer DEFAULT true,
	`dark_mode` integer DEFAULT false,
	`app_notifications` integer DEFAULT true,
	`email_notifications` integer DEFAULT true,
	`language` text DEFAULT 'en',
	`in_app_browser` integer DEFAULT true,
	`platform_filters` text DEFAULT '[]',
	`phone` text,
	`cv_link` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "email_verified", "image", "is_active", "dark_mode", "app_notifications", "email_notifications", "language", "in_app_browser", "platform_filters", "phone", "cv_link", "created_at", "updated_at") SELECT "id", "name", "email", "email_verified", "image", "is_active", "dark_mode", "app_notifications", "email_notifications", "language", "in_app_browser", "platform_filters", "phone", "cv_link", "created_at", "updated_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);