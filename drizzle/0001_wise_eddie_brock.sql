PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`goalId` text NOT NULL,
	`orderIndex` integer NOT NULL,
	`startBookId` text NOT NULL,
	`startChapter` integer NOT NULL,
	`startVerse` integer NOT NULL,
	`endBookId` text NOT NULL,
	`endChapter` integer NOT NULL,
	`endVerse` integer NOT NULL,
	`tier` integer DEFAULT -1 NOT NULL,
	`status` text DEFAULT 'locked' NOT NULL,
	`memorizedAt` integer,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chunks`("id", "goalId", "orderIndex", "startBookId", "startChapter", "startVerse", "endBookId", "endChapter", "endVerse", "tier", "status", "memorizedAt") SELECT "id", "goalId", "orderIndex", "startBookId", "startChapter", "startVerse", "endBookId", "endChapter", "endVerse", "tier", "status", "memorizedAt" FROM `chunks`;--> statement-breakpoint
DROP TABLE `chunks`;--> statement-breakpoint
ALTER TABLE `__new_chunks` RENAME TO `chunks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `chunks_goalId_idx` ON `chunks` (`goalId`,`orderIndex`);