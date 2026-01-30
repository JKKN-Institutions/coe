import { NextResponse } from 'next/server'

/**
 * API route to fetch an image and convert it to base64
 * This is needed because client-side fetch of Supabase storage URLs may fail due to CORS
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const imageUrl = searchParams.get('url')

		console.log('[Image to Base64] Received request for URL:', imageUrl?.substring(0, 100))

		if (!imageUrl) {
			return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
		}

		// Fetch the image from the URL
		console.log('[Image to Base64] Fetching image...')
		const response = await fetch(imageUrl)

		console.log('[Image to Base64] Fetch response status:', response.status, response.statusText)

		if (!response.ok) {
			console.warn(`[Image to Base64] Failed to fetch image: ${response.status} ${response.statusText}`)
			return NextResponse.json({ error: `Failed to fetch image: ${response.status}`, base64: null }, { status: 200 })
		}

		// Get the content type
		const contentType = response.headers.get('content-type') || 'image/jpeg'
		console.log('[Image to Base64] Content-Type:', contentType)

		// Convert to array buffer then to base64
		const arrayBuffer = await response.arrayBuffer()
		const base64 = Buffer.from(arrayBuffer).toString('base64')

		console.log('[Image to Base64] Converted to base64, size:', base64.length, 'chars')

		// Return as data URI
		const dataUri = `data:${contentType};base64,${base64}`

		return NextResponse.json({ base64: dataUri })

	} catch (error) {
		console.error('[Image to Base64] Error:', error)
		return NextResponse.json({ error: 'Failed to convert image', base64: null }, { status: 200 })
	}
}
