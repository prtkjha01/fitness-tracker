import { randomUUID } from 'expo-crypto';

/**
 * Client-generated row id. Every insert carries its own id, so replaying a queued
 * offline write is idempotent (the second attempt hits the primary key and is ignored).
 */
export function newId(): string {
  return randomUUID();
}
