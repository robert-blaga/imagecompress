import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return new NextResponse('No file uploaded', { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const originalSize = buffer.byteLength;

  const image = sharp(Buffer.from(buffer));

  // Determine the output format based on the input file type
  const inputFormat = file.name.split('.').pop()?.toLowerCase();
  let outputFormat: 'jpeg' | 'png' | 'webp';

  if (inputFormat === 'png') {
    outputFormat = 'png';
  } else if (inputFormat === 'jpg' || inputFormat === 'jpeg') {
    outputFormat = 'jpeg';
  } else {
    outputFormat = 'webp'; // Default to WebP for other formats
  }

  let compressedBuffer: Buffer;

  if (outputFormat === 'png') {
    compressedBuffer = await image
      .png({
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true
      })
      .toBuffer();
  } else if (outputFormat === 'jpeg') {
    compressedBuffer = await image
      .jpeg({
        quality: 85,
        mozjpeg: true
      })
      .toBuffer();
  } else {
    // WebP
    compressedBuffer = await image
      .webp({
        quality: 80,
        lossless: false,
        nearLossless: true,
        effort: 6
      })
      .toBuffer();
  }

  const compressedSize = compressedBuffer.length;
  const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

  return new NextResponse(compressedBuffer, {
    headers: {
      'Content-Type': `image/${outputFormat}`,
      'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.${outputFormat}"`,
      'X-Compression-Ratio': savings
    },
  });
}
