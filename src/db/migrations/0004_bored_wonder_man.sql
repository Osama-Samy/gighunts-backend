ALTER TABLE `gigs` ADD `price_text` text;--> statement-breakpoint
ALTER TABLE `gigs` ADD `min_price` real;--> statement-breakpoint
ALTER TABLE `gigs` ADD `max_price` real;--> statement-breakpoint
ALTER TABLE `gigs` ADD `currency` text;--> statement-breakpoint
ALTER TABLE `gigs` ADD `source` text;--> statement-breakpoint
ALTER TABLE `gigs` ADD `key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `gigs_url_unique` ON `gigs` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `skills_name_unique` ON `skills` (`name`);