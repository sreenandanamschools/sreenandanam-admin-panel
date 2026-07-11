'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Camera, X } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string | null
  onChange?: (url: string) => void
  onRemove?: () => void
  folder?: string
  shape?: 'avatar' | 'square'
  multiple?: boolean
  urls?: string[]
  onUrlsChange?: (urls: string[]) => void
  onProgress?: (current: number, total: number) => void
}

export function ImageUpload({ value, onChange, onRemove, folder, shape = 'avatar', multiple = false, urls = [], onUrlsChange, onProgress }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadSingleFile = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (!cloudName) {
      throw new Error('Cloudinary cloud name is not configured in .env.local')
    }

    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder })
    })

    if (!signRes.ok) {
      const err = await signRes.json()
      throw new Error(err.error || 'Failed to get upload signature')
    }

    const { signature, timestamp, api_key, upload_preset } = await signRes.json()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', api_key)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)

    if (upload_preset) {
      formData.append('upload_preset', upload_preset)
    }
    if (folder) {
      formData.append('folder', folder)
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Cloudinary upload failed')
    }

    const data = await response.json()
    return data.secure_url
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (multiple) {
      const fileList = e.target.files
      if (!fileList || fileList.length === 0) return
      const files: File[] = Array.from(fileList)

      for (const file of files) {
        if (!file.type.includes('image')) {
          return toast.error('Please select image files only.')
        }
        if (file.size > 5 * 1024 * 1024) {
          return toast.error('Each file should be less than 5MB.')
        }
      }

      setIsUploading(true)
      onProgress?.(0, files.length)
      const newUrls: string[] = []

      try {
        for (let i = 0; i < files.length; i++) {
          const url = await uploadSingleFile(files[i])
          newUrls.push(url)
          onUrlsChange?.([...urls, ...newUrls])
          onProgress?.(i + 1, files.length)
        }
        toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`)
      } catch (error: any) {
        toast.error(error.message || 'Something went wrong during upload')
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    // Single mode
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes('image')) {
      return toast.error('Please select an image file.')
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('File size should be less than 5MB.')
    }

    setIsUploading(true)

    try {
      const url = await uploadSingleFile(file)
      onChange?.(url)
      toast.success('Image uploaded successfully')
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong during upload')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleUpload}
        disabled={isUploading}
        multiple={multiple}
      />

      {multiple ? (
        <>
          {urls.length > 0 ? (
            <div className="flex flex-wrap gap-3 justify-center">
              {urls.map((url, index) => (
                <div key={url} className="relative group h-24 w-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                  <Image src={url} alt={`Upload ${index + 1}`} fill className="object-cover" sizes="96px" />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => onUrlsChange?.(urls.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              ) : (
                <Camera className="h-10 w-10 text-slate-300" />
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? 'Uploading...' : urls.length > 0 ? 'Add More' : 'Upload Images'}
            </Button>
          </div>
          {urls.length > 0 && !isUploading && (
            <p className="text-xs text-slate-500">{urls.length} image{urls.length > 1 ? 's' : ''} selected</p>
          )}
        </>
      ) : (
        <>
          <div className={`relative overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center ${shape === 'avatar' ? 'h-32 w-32 rounded-full' : 'h-48 w-full rounded-xl'
            }`}>
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            ) : value ? (
              <Image src={value} alt="Profile" fill className="object-contain p-2" sizes="128px" />
            ) : (
              <Camera className="h-10 w-10 text-slate-300" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? 'Uploading...' : value ? 'Change Image' : 'Upload Image'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onRemove?.()}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">Max size 5MB. Formats: JPG, PNG, WEBP.</p>
        </>
      )}
    </div>
  )
}
