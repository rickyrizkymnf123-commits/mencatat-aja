import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_id: string;
  category?: string;
  duration?: string;
  created_at?: string;
}

const MOCK_TUTORIALS_PATH = path.join(process.cwd(), 'src/lib/mock_tutorials.json');

// Memory cache for super fast and reliable response
let cachedTutorials: TutorialVideo[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Extracts YouTube Video ID from any standard YouTube URL format
 * (e.g. watch?v=..., youtu.be/..., embed/..., shorts/...)
 */
export function extractYouTubeId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex to match YouTube ID in various formats
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (match && match[1]) {
    return match[1];
  }

  return '';
}

/**
 * Reads fallback tutorial videos from local JSON file
 */
function getFallbackTutorials(): TutorialVideo[] {
  try {
    if (fs.existsSync(MOCK_TUTORIALS_PATH)) {
      const content = fs.readFileSync(MOCK_TUTORIALS_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading fallback tutorials from mock file:', e);
  }

  return [
    {
      id: 'tut_1',
      title: 'Tutorial Lengkap: Menghubungkan Bot Telegram & Catat Otomatis via AI Chat',
      description: 'Pelajari langkah mudah menghubungkan akun Anda dengan bot Telegram (@MencatatKeuanganBot atau Bot pribadi Anda via token BotFather). Cukup kirim chat "Beli kopi 25rb pakai GoPay" dan transaksi langsung tercatat rapi.',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'Bot Telegram',
      duration: '04:20',
      created_at: new Date().toISOString()
    }
  ];
}

/**
 * Fetches all tutorial videos (Supabase -> File Fallback)
 */
export async function getVideoTutorials(): Promise<TutorialVideo[]> {
  const now = Date.now();
  if (cachedTutorials && (now - cacheTime < CACHE_TTL)) {
    return cachedTutorials;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isPlaceholder = !supabaseUrl || 
    supabaseUrl.includes('your-supabase-project-id') || 
    supabaseUrl.includes('placeholder-project');

  if (isPlaceholder) {
    const fallback = getFallbackTutorials();
    cachedTutorials = fallback;
    cacheTime = now;
    return fallback;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('name', 'video_tutorials')
      .maybeSingle();

    if (!error && data && data.api_key) {
      try {
        const parsed = JSON.parse(data.api_key);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedTutorials = parsed;
          cacheTime = now;
          return parsed;
        }
      } catch (jsonErr) {
        console.warn('Error parsing tutorials JSON from ai_providers:', jsonErr);
      }
    }
  } catch (dbErr) {
    console.warn('Failed to fetch tutorials from ai_providers table:', dbErr);
  }

  const fallback = getFallbackTutorials();
  cachedTutorials = fallback;
  cacheTime = now;
  return fallback;
}

/**
 * Saves all tutorial videos to Supabase & local file
 */
export async function saveAllVideoTutorials(tutorials: TutorialVideo[]): Promise<boolean> {
  cachedTutorials = tutorials;
  cacheTime = Date.now();

  // 1. Save to local fallback file if possible
  try {
    fs.writeFileSync(MOCK_TUTORIALS_PATH, JSON.stringify(tutorials, null, 2));
  } catch (fsErr) {
    console.warn('Could not write to local mock tutorials file (likely read-only serverless):', fsErr);
  }

  // 2. Save to Supabase ai_providers table
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isPlaceholder = !supabaseUrl || 
    supabaseUrl.includes('your-supabase-project-id') || 
    supabaseUrl.includes('placeholder-project');

  if (!isPlaceholder) {
    try {
      const jsonPayload = JSON.stringify(tutorials);
      const { data: existing } = await supabaseAdmin
        .from('ai_providers')
        .select('id')
        .eq('name', 'video_tutorials')
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin
          .from('ai_providers')
          .update({
            api_key: jsonPayload,
            base_url: 'https://youtube.com',
            model: 'tutorials_v1',
            is_active: true
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('ai_providers')
          .insert({
            name: 'video_tutorials',
            api_key: jsonPayload,
            base_url: 'https://youtube.com',
            model: 'tutorials_v1',
            is_active: true
          });
      }
      return true;
    } catch (dbErr) {
      console.error('Error saving tutorials to Supabase ai_providers:', dbErr);
    }
  }

  return true;
}

/**
 * Adds a new tutorial video
 */
export async function addVideoTutorial(item: Omit<TutorialVideo, 'id' | 'youtube_id' | 'created_at'>): Promise<TutorialVideo> {
  const currentList = await getVideoTutorials();
  const youtubeId = extractYouTubeId(item.youtube_url);
  
  const newTutorial: TutorialVideo = {
    id: `tut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: item.title.trim(),
    description: item.description.trim(),
    youtube_url: item.youtube_url.trim(),
    youtube_id: youtubeId || 'dQw4w9WgXcQ',
    category: item.category?.trim() || 'Umum',
    duration: item.duration || '03:00',
    created_at: new Date().toISOString()
  };

  const updatedList = [newTutorial, ...currentList];
  await saveAllVideoTutorials(updatedList);
  return newTutorial;
}

/**
 * Updates an existing tutorial video
 */
export async function updateVideoTutorial(id: string, updates: Partial<TutorialVideo>): Promise<TutorialVideo | null> {
  const currentList = await getVideoTutorials();
  let updatedTutorial: TutorialVideo | null = null;

  const updatedList = currentList.map(t => {
    if (t.id === id) {
      const youtubeUrl = updates.youtube_url ? updates.youtube_url.trim() : t.youtube_url;
      const youtubeId = updates.youtube_url ? extractYouTubeId(updates.youtube_url) : t.youtube_id;

      updatedTutorial = {
        ...t,
        title: updates.title !== undefined ? updates.title.trim() : t.title,
        description: updates.description !== undefined ? updates.description.trim() : t.description,
        youtube_url: youtubeUrl,
        youtube_id: youtubeId || t.youtube_id,
        category: updates.category !== undefined ? updates.category.trim() : t.category,
        duration: updates.duration !== undefined ? updates.duration : t.duration
      };
      return updatedTutorial;
    }
    return t;
  });

  if (updatedTutorial) {
    await saveAllVideoTutorials(updatedList);
  }

  return updatedTutorial;
}

/**
 * Deletes a tutorial video by ID
 */
export async function deleteVideoTutorial(id: string): Promise<boolean> {
  const currentList = await getVideoTutorials();
  const filtered = currentList.filter(t => t.id !== id);
  await saveAllVideoTutorials(filtered);
  return true;
}
