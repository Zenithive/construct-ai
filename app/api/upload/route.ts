/**
 * POST /api/upload
 * Accepts multipart/form-data with field "file" (PDF, DOC, DOCX, max 10 MB).
 * Saves to local filesystem and records metadata in DB.
 */
import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, err, isAllowedFileType, MAX_FILE_SIZE_BYTES } from '@/lib/helpers';

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve('./uploads');

export async function POST(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return err('No file provided. Use field name "file".');
    if (!isAllowedFileType(file.type)) return err('Invalid file type. Only PDF, DOC, DOCX allowed.');
    if (file.size > MAX_FILE_SIZE_BYTES) return err('File exceeds the 10 MB size limit.');

    const ext = path.extname(file.name) || '.bin';
    const storedName = `${uuidv4()}${ext}`;
    const userDir = path.join(UPLOAD_DIR, authUser.userId);

    await mkdir(userDir, { recursive: true });
    await writeFile(path.join(userDir, storedName), Buffer.from(await file.arrayBuffer()));

    const fileId = uuidv4();
    const relativePath = `uploads/${authUser.userId}/${storedName}`;

    await query(
      `INSERT INTO uploaded_files (id, user_id, original_name, stored_name, mime_type, size_bytes, path, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [fileId, authUser.userId, file.name, storedName, file.type, file.size, relativePath]
    );

    return ok({ file: { id: fileId, name: file.name, path: relativePath, size: file.size, mimeType: file.type } }, 201);
  } catch (e) {
    console.error('[POST /api/upload]', e);
    return err('Internal server error.', 500);
  }
}
