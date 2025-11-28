"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X, Loader2 } from "lucide-react"
import { uploadImage, deleteImage } from "@/lib/supabase"
import { toast } from "sonner"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  folder?: string
  disabled?: boolean
  onDeleteOldImage?: (url: string) => void // Callback để xóa ảnh cũ khi component unmount
}

export function ImageUpload({ value, onChange, folder = "avatars", disabled, onDeleteOldImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null) // Lưu URL ảnh cũ đã upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lưu URL ảnh cũ khi value thay đổi từ bên ngoài (edit mode)
  useEffect(() => {
    if (value && value.includes('supabase.co')) {
      setOldImageUrl(value)
    }
  }, [])

  // Cleanup: xóa ảnh cũ khi component unmount nếu có callback
  useEffect(() => {
    return () => {
      if (oldImageUrl && onDeleteOldImage) {
        onDeleteOldImage(oldImageUrl)
      }
    }
  }, [oldImageUrl, onDeleteOldImage])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn file ảnh")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB")
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Xóa ảnh cũ trước khi upload ảnh mới (nếu có)
    const previousImageUrl = oldImageUrl || (value && value.includes('supabase.co') ? value : null)
    
    // Upload to Supabase
    setUploading(true)
    try {
      const url = await uploadImage(file, folder)
      
      // Xóa ảnh cũ sau khi upload thành công
      if (previousImageUrl && previousImageUrl !== url) {
        await deleteImage(previousImageUrl)
      }
      
      setOldImageUrl(url) // Lưu URL ảnh mới
      onChange(url)
      toast.success("Upload ảnh thành công")
    } catch (error: any) {
      toast.error(error?.message || "Upload ảnh thất bại")
      setPreview(value || null)
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    // Xóa ảnh khỏi Supabase nếu đã upload
    const imageToDelete = oldImageUrl || (value && value.includes('supabase.co') ? value : null)
    if (imageToDelete) {
      await deleteImage(imageToDelete)
    }
    
    setPreview(null)
    setOldImageUrl(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 border-2 border-gray-200">
        <AvatarImage src={preview || undefined} alt="Preview" />
        <AvatarFallback className="bg-gray-100">
          <Upload className="h-6 w-6 text-gray-400" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          id="image-upload"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang upload...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Chọn ảnh
              </>
            )}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="mr-2 h-4 w-4" />
              Xóa
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          JPG, PNG hoặc GIF (tối đa 5MB)
        </p>
      </div>
    </div>
  )
}

