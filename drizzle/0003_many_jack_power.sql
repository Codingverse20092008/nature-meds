ALTER TABLE `orders` ADD `cancel_requested_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `cancel_approved_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `language` text DEFAULT 'en';