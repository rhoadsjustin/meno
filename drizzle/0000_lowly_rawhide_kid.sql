CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`chunkId` text NOT NULL,
	`mode` text NOT NULL,
	`accuracy` real NOT NULL,
	`durationMs` integer NOT NULL,
	`missedWords` text DEFAULT '[]' NOT NULL,
	`createdAt` integer NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`chunkId`) REFERENCES `chunks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_chunkId_idx` ON `attempts` (`chunkId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `badges` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`earnedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`goalId` text NOT NULL,
	`orderIndex` integer NOT NULL,
	`startBookId` text NOT NULL,
	`startChapter` integer NOT NULL,
	`startVerse` integer NOT NULL,
	`endBookId` text NOT NULL,
	`endChapter` integer NOT NULL,
	`endVerse` integer NOT NULL,
	`tier` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'locked' NOT NULL,
	`memorizedAt` integer,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chunks_goalId_idx` ON `chunks` (`goalId`,`orderIndex`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`translationId` text NOT NULL,
	`startBookId` text NOT NULL,
	`startChapter` integer NOT NULL,
	`startVerse` integer NOT NULL,
	`endBookId` text NOT NULL,
	`endChapter` integer NOT NULL,
	`endVerse` integer NOT NULL,
	`title` text NOT NULL,
	`createdAt` integer NOT NULL,
	`targetDate` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`challengeId` text
);
--> statement-breakpoint
CREATE TABLE `lockConfig` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`mode` text DEFAULT 'firstPickup' NOT NULL,
	`relockMinutes` integer,
	`scheduleJson` text,
	`verseSource` text DEFAULT 'current' NOT NULL,
	`overrideStyle` text DEFAULT 'instant' NOT NULL,
	`activitySelectionToken` text
);
--> statement-breakpoint
CREATE TABLE `lockEvents` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`verseChunkId` text,
	`accuracy` real,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviewItems` (
	`id` text PRIMARY KEY NOT NULL,
	`chunkId` text NOT NULL,
	`easiness` real DEFAULT 2.5 NOT NULL,
	`intervalDays` real DEFAULT 1 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`dueAt` integer NOT NULL,
	`lastReviewedAt` integer,
	`health` text DEFAULT 'fresh' NOT NULL,
	FOREIGN KEY (`chunkId`) REFERENCES `chunks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviewItems_dueAt_idx` ON `reviewItems` (`dueAt`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` integer PRIMARY KEY NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`longest` integer DEFAULT 0 NOT NULL,
	`lastActiveDate` text,
	`graceDaysAvailable` integer DEFAULT 1 NOT NULL,
	`graceDaysUsedThisWeek` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` text PRIMARY KEY NOT NULL,
	`abbrev` text NOT NULL,
	`name` text NOT NULL,
	`languageCode` text NOT NULL,
	`licenseType` text NOT NULL,
	`source` text NOT NULL,
	`isDownloaded` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verses` (
	`translationId` text NOT NULL,
	`bookId` text NOT NULL,
	`chapter` integer NOT NULL,
	`verse` integer NOT NULL,
	`text` text NOT NULL,
	PRIMARY KEY(`translationId`, `bookId`, `chapter`, `verse`)
);
