CREATE TABLE `user_cvs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`cv_link` text NOT NULL,
	`file_name` text,
	`skills` text,
	`ats_score` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
