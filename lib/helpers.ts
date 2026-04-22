/**
 * lib/helpers.ts — Shared utilities for API routes.
 */
import { NextResponse } from 'next/server';

// ── Response helpers ──────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ── Validation ────────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 6;
}

// ── OTP ───────────────────────────────────────────────────────────────────────

export function generateOTP(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

export function otpExpiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

// ── File upload ───────────────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

// ── Pagination ────────────────────────────────────────────────────────────────

export function parsePagination(searchParams: URLSearchParams): { limit: number; offset: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  return { limit, offset: (page - 1) * limit };
}
