import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { folder } = body

    const timestamp = Math.round(new Date().getTime() / 1000)
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey = process.env.CLOUDINARY_API_KEY
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!apiSecret || !apiKey) {
      return NextResponse.json(
        { error: 'Cloudinary API keys are not configured. Please add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your .env.local' },
        { status: 500 }
      )
    }

    // Prepare parameters for signing
    // Cloudinary requires all parameters (except file, api_key, cloud_name, resource_type) 
    // to be included in the signature calculation, sorted alphabetically.
    const paramsToSign: Record<string, string | number> = {
      timestamp,
    }

    if (uploadPreset) {
      paramsToSign['upload_preset'] = uploadPreset
    }
    
    if (folder) {
      paramsToSign['folder'] = folder
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(paramsToSign).sort()
    
    // Create URL-encoded style query string
    const signString = sortedKeys.map(key => `${key}=${paramsToSign[key]}`).join('&')
    
    // Append secret to the end
    const stringToSign = signString + apiSecret

    // Generate SHA-1 signature
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex')

    return NextResponse.json({
      signature,
      timestamp,
      api_key: apiKey,
      upload_preset: uploadPreset,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
