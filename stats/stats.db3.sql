BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "commands" (
	"channel"	TEXT NOT NULL,
	"message"	TEXT NOT NULL,
	"guild"		TEXT NOT NULL,
	"author" 	TEXT NOT NULL,
	"id" 		TEXT NOT NULL,
    "command"   TEXT NOT NULL,
	PRIMARY KEY("message")
);
COMMIT;