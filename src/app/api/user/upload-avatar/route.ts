import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { db } from '../../db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large. Maximum 5MB allowed.' }, { status: 400 });
    }

    // Generate base filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'png';
    const safeEmail = session.user.email.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const baseName = `avatar_${safeEmail}_${timestamp}.${fileExtension}`;

    // Convert file to buffer once
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Prefer Vercel Blob in serverless (read-only FS); fallback to local disk in dev
    let avatarUrl: string;
    try {
      if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob');
        const { url } = await put(`uploads/${baseName}` /* path prefix for organization */, buffer, {
          access: 'public',
          addRandomSuffix: true,
          contentType: file.type || 'image/png',
          // Pass token explicitly when available (useful for local dev or when integration token isn't auto-injected yet)
          ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
        });
        avatarUrl = url;
      } else {
        // Local dev fallback: save to public/uploads
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
          try { await mkdir(uploadsDir, { recursive: true }); } catch {}
        }
        const filePath = join(uploadsDir, baseName);
        await writeFile(filePath, buffer);
        avatarUrl = `/uploads/${baseName}`;
      }
    } catch (e) {
      console.error('Avatar upload storage error:', e);
      return NextResponse.json({ error: 'Failed to store avatar' }, { status: 500 });
    }

    // Persist avatarUrl via shared DB (supports Redis)
    await db.read();
    const user = db.data.users.find(u => u.email === session.user!.email);
    if (user) {
      user.avatarUrl = avatarUrl;
      await db.write();
    }

    return NextResponse.json({ 
      avatarUrl,
      message: 'Avatar uploaded successfully' 
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 