import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalFormat = file.name.split('.').pop()?.toLowerCase();
  let compressedBuffer: Buffer;
  let outputFormat: string;

  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (originalFormat === 'png') {
    outputFormat = 'png';
    compressedBuffer = await image
      .png({
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true
      })
      .toBuffer();
  } else if (originalFormat === 'jpg' || originalFormat === 'jpeg') {
    outputFormat = 'jpeg';
    compressedBuffer = await image
      .jpeg({
        quality: 85,
        mozjpeg: true
      })
      .toBuffer();
  } else {
    // For other formats, convert to WebP
    outputFormat = 'webp';
    compressedBuffer = await image
      .webp({
        quality: 80,
        lossless: false,
        nearLossless: true,
        reductionEffort: 6
      })
      .toBuffer();
  }

  const originalSize = buffer.length;
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
