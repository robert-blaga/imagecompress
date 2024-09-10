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

  const image = sharp(buffer);
  // Remove the unused metadata line
  // const _metadata = await image.metadata();

  if (file.name.split('.').pop()?.toLowerCase() === 'png') {
    const compressedBuffer = await image
      .png({
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true
      })
      .toBuffer();
    const compressedSize = compressedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    return new NextResponse(compressedBuffer, {
      headers: {
        'Content-Type': `image/png`,
        'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.png"`,
        'X-Compression-Ratio': savings
      },
    });
  } else if (file.name.split('.').pop()?.toLowerCase() === 'jpg' || file.name.split('.').pop()?.toLowerCase() === 'jpeg') {
    const compressedBuffer = await image
      .jpeg({
        quality: 85,
        mozjpeg: true
      })
      .toBuffer();
    const compressedSize = compressedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    return new NextResponse(compressedBuffer, {
      headers: {
        'Content-Type': `image/jpeg`,
        'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.jpeg"`,
        'X-Compression-Ratio': savings
      },
    });
  } else {
    // For other formats, convert to WebP
    let compressedBuffer: Buffer;
    if (outputFormat === 'webp') {
      compressedBuffer = await image
        .webp({
          quality: 80,
          lossless: false,
          nearLossless: true,
          effort: 6  // Use 'effort' instead of 'reductionEffort'
        })
        .toBuffer();
    } else {
      compressedBuffer = await image
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const compressedSize = compressedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    return new NextResponse(compressedBuffer, {
      headers: {
        'Content-Type': `image/webp`,
        'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.webp"`,
        'X-Compression-Ratio': savings
      },
    });
  }
}
