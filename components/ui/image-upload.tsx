'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Camera, X } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ImageUploadProps {
  value: string | null | undefined
  onChange: (url: string) => void
  onRemove: () => void
  folder?: string
  shape?: 'avatar' | 'square'
}

export function ImageUpload({ value, onChange, onRemove, folder, shape = 'avatar' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Quick validation
    if (!file.type.includes('image')) {
      return toast.error('Please select an image file.')
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('File size should be less than 5MB.')
    }

    setIsUploading(true)

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      if (!cloudName) {
        throw new Error('Cloudinary cloud name is not configured in .env.local')
      }

      // Step 1: Get signature from backend
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

      // Step 2: Upload to Cloudinary with signature
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
      onChange(data.secure_url)
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
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleUpload}
          disabled={isUploading}
        />
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
            onClick={onRemove}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500">Max size 5MB. Formats: JPG, PNG, WEBP.</p>
    </div>
  )
}
