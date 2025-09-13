import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { db } from '../../../db';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.read();
    const { id } = params;
  const groupIndex = db.data.groups.findIndex((g: any) => g.id === id);

    if (groupIndex === -1) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = db.data.groups[groupIndex];
  const currentUser = db.data.users.find((u: any) => u.email === session.user!.email);

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if current user is a member of the group
  const isMember = group.members.some((member: any) => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `group_${id}_${timestamp}.${fileExtension}`;

    // Convert file to buffer once
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Prefer Vercel Blob in serverless; fallback to local disk in dev
    let imageUrl: string;
    try {
      if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob');
        const { url } = await put(`uploads/${filename}`, buffer, {
          access: 'public',
          addRandomSuffix: true,
          contentType: file.type || 'image/jpeg',
          ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
        });
        imageUrl = url;
      } else {
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
          try { await mkdir(uploadsDir, { recursive: true }); } catch {}
        }
        const filepath = join(uploadsDir, filename);
        await writeFile(filepath, buffer);
        imageUrl = `/uploads/${filename}`;
      }
    } catch (e) {
      console.error('Group image upload storage error:', e);
      return NextResponse.json({ error: 'Failed to store image' }, { status: 500 });
    }

    // Update group profile image URL and persist
    db.data.groups[groupIndex].imageUrl = imageUrl;
    await db.write();

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading group image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
