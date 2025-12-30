import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Upload image to Supabase Storage
export async function uploadImage(file: File, folder: string = 'avatars'): Promise<string> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    // Use folder only if it's different from bucket name, otherwise just use filename
    const filePath = folder && folder !== 'client-avatars' ? `${folder}/${fileName}` : fileName

    // Upload file to bucket 'client-avatars'
    const { data, error } = await supabase.storage
      .from('client-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('client-avatars')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to upload image')
  }
}

// Delete image from Supabase Storage
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl || !imageUrl.includes('supabase.co')) {
      return // Not a Supabase URL, skip
    }

    // Extract path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/client-avatars/filename.jpg
    const urlParts = imageUrl.split('/storage/v1/object/client-avatars/')
    if (urlParts.length < 2) {
      return
    }
    
    const filePath = urlParts[1] // Get filename or folder/filename
    
    const { error } = await supabase.storage
      .from('client-avatars')
      .remove([filePath])

    if (error) {
      // Don't throw - image might not exist or already deleted
    }
  } catch (error: any) {
    // Don't throw - image might not exist
  }
}

