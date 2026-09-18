import { NextResponse } from 'next/server';
import { 
  getVideoTutorials, 
  addVideoTutorial, 
  updateVideoTutorial, 
  deleteVideoTutorial,
  extractYouTubeId 
} from '@/lib/tutorials';

export async function GET() {
  try {
    const tutorials = await getVideoTutorials();
    return NextResponse.json({
      success: true,
      tutorials: tutorials || []
    });
  } catch (err: any) {
    console.error('Error fetching tutorials API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, youtube_url, category, duration } = body;

    if (!title || !youtube_url) {
      return NextResponse.json(
        { error: 'Judul dan Link YouTube wajib diisi.' },
        { status: 400 }
      );
    }

    const youtubeId = extractYouTubeId(youtube_url);
    if (!youtubeId) {
      return NextResponse.json(
        { error: 'Format link YouTube tidak valid. Harap gunakan link video YouTube yang benar (contoh: https://www.youtube.com/watch?v=... atau https://youtu.be/...)' },
        { status: 400 }
      );
    }

    const created = await addVideoTutorial({
      title,
      description: description || '',
      youtube_url,
      category: category || 'Umum',
      duration: duration || '03:00'
    });

    return NextResponse.json({
      success: true,
      tutorial: created
    });
  } catch (err: any) {
    console.error('Error adding tutorial API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, youtube_url, category, duration } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Video Tutorial diperlukan' }, { status: 400 });
    }

    if (youtube_url) {
      const youtubeId = extractYouTubeId(youtube_url);
      if (!youtubeId) {
        return NextResponse.json(
          { error: 'Format link YouTube tidak valid.' },
          { status: 400 }
        );
      }
    }

    const updated = await updateVideoTutorial(id, {
      title,
      description,
      youtube_url,
      category,
      duration
    });

    if (!updated) {
      return NextResponse.json({ error: 'Video tutorial tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tutorial: updated
    });
  } catch (err: any) {
    console.error('Error updating tutorial API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Video Tutorial diperlukan' }, { status: 400 });
    }

    await deleteVideoTutorial(id);
    return NextResponse.json({
      success: true,
      message: 'Video tutorial berhasil dihapus'
    });
  } catch (err: any) {
    console.error('Error deleting tutorial API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
