CREATE TABLE `ai_chat_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`session_key` text NOT NULL,
	`query` text NOT NULL,
	`normalized_query` text NOT NULL,
	`context_medicines` text NOT NULL,
	`context_source` text NOT NULL,
	`response_text` text NOT NULL,
	`response_source` text NOT NULL,
	`response_time_ms` integer NOT NULL,
	`safety_status` text NOT NULL,
	`fallback_reason` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_chat_logs_user_idx` ON `ai_chat_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_chat_logs_session_idx` ON `ai_chat_logs` (`session_key`);--> statement-breakpoint
CREATE INDEX `ai_chat_logs_created_idx` ON `ai_chat_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `ai_chat_logs_response_source_idx` ON `ai_chat_logs` (`response_source`);--> statement-breakpoint
CREATE TABLE `ai_chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`session_key` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_chat_messages_user_idx` ON `ai_chat_messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_chat_messages_session_idx` ON `ai_chat_messages` (`session_key`);--> statement-breakpoint
CREATE INDEX `ai_chat_messages_created_idx` ON `ai_chat_messages` (`created_at`);