CREATE TABLE `languages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`locale` text NOT NULL,
	`textDirection` text DEFAULT 'ltr' NOT NULL,
	`fetchedAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `translations` ADD `attribution` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `translations` ADD `booksJson` text;--> statement-breakpoint
ALTER TABLE `translations` ADD `textDirection` text;--> statement-breakpoint
ALTER TABLE `translations` ADD `fetchedAt` integer;