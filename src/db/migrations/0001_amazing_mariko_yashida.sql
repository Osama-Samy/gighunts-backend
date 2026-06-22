ALTER TABLE `user` ADD `is_active` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `cv`;--> statement-breakpoint
ALTER TABLE `skills` ADD `name` text NOT NULL;