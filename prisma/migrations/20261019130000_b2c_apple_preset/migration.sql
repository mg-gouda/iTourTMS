-- Enum value on its own: Postgres can't use a new enum value in the transaction that adds it.
ALTER TYPE "ThemePreset" ADD VALUE 'APPLE';
