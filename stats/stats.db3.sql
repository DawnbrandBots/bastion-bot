BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "commands" (
	"id"	TEXT NOT NULL,
	"guild"	TEXT NOT NULL,
	"channel"	TEXT NOT NULL,
	"author" 	TEXT NOT NULL,
	"command"	TEXT NOT NULL,
	"args"	TEXT NOT NULL,
	"latency"	INTEGER NOT NULL,
	PRIMARY KEY("id")
);
COMMIT;
