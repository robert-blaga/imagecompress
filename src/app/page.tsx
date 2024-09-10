'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface UploadedImage {
  file: File;
  id: string;
  status: 'compressing' | 'done' | 'error';
  compressedUrl?: string;
  compressionRatio?: string;
  originalSize: string;
  compressedSize?: string;
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [totalStats, setTotalStats] = useState({ original: 0, compressed: 0, saved: 0 });

  const compressImage = useCallback(async (image: UploadedImage) => {
    const formData = new FormData();
    formData.append('file', image.file);

    try {
      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const compressedUrl = URL.createObjectURL(blob);
        const compressionRatio = response.headers.get('X-Compression-Ratio') || 'N/A';
        const compressedSize = formatFileSize(blob.size);

        setImages(prevImages => prevImages.map(img => 
          img.id === image.id ? { 
            ...img, 
            status: 'done', 
            compressedUrl, 
            compressionRatio, 
            compressedSize 
          } : img
        ));
      } else {
        throw new Error('Compression failed');
      }
    } catch (error) {
      setImages(prevImages => prevImages.map(img => 
        img.id === image.id ? { ...img, status: 'error' } : img
      ));
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'compressing' as const,
      originalSize: formatFileSize(file.size),
    }));
    setImages(prevImages => [...prevImages, ...newImages]);
  }, []);

  useEffect(() => {
    images.forEach(image => {
      if (image.status === 'compressing') {
        compressImage(image);
      }
    });
  }, [images, compressImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: true });

  const downloadAll = async () => {
    const zip = new JSZip();
    const compressedImages = images.filter(img => img.status === 'done' && img.compressedUrl);

    for (const image of compressedImages) {
      try {
        const response = await fetch(image.compressedUrl!);
        const blob = await response.blob();
        zip.file(`compressed_${image.file.name}`, blob);
      } catch (error) {
        console.error(`Error adding ${image.file.name} to zip:`, error);
      }
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'compressed_images.zip');
    } catch (error) {
      console.error('Error generating zip file:', error);
    }
  };

  const calculateTotalStats = useCallback(() => {
    const original = images.reduce((sum, img) => sum + img.file.size, 0);
    const compressed = images.reduce((sum, img) => {
      if (img.status === 'done' && img.compressedSize) {
        return sum + parseFileSize(img.compressedSize);
      }
      return sum;
    }, 0);
    const saved = original - compressed;
    const savedPercentage = original > 0 ? (saved / original) * 100 : 0;

    setTotalStats({
      original: original,
      compressed: compressed,
      saved: savedPercentage
    });
  }, [images]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parseFileSize = (sizeStr: string) => {
    const units = {
      'Bytes': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    const [size, unit] = sizeStr.split(' ');
    return parseFloat(size) * units[unit as keyof typeof units];
  };

  const getFormatLabel = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png':
        return 'PNG';
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'webp':
        return 'WebP';
      default:
        return 'Unknown';
    }
  };

  const getFormatLabelColor = (format: string) => {
    switch (format) {
      case 'PNG':
        return 'bg-yellow-200 text-yellow-800';
      case 'JPEG':
        return 'bg-red-200 text-red-800';
      case 'WebP':
        return 'bg-blue-200 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const truncateFileName = (fileName: string, maxLength: number) => {
    if (fileName.length <= maxLength) return fileName;
    const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
    const extension = fileName.split('.').pop();
    const truncatedName = nameWithoutExtension.slice(0, maxLength - 3) + '...';
    return `${truncatedName}.${extension}`;
  };

  useEffect(() => {
    calculateTotalStats();
  }, [images, calculateTotalStats]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8">Bulk Image Compression App</h1>
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-8 text-center cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the images here ...</p>
        ) : (
          <p>Drag 'n' drop images here, or click to select files</p>
        )}
      </div>
      {images.length > 0 && (
        <div className="w-full max-w-4xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-2 px-4">Image</th>
                <th className="text-left py-2 px-4">Name</th>
                <th className="text-left py-2 px-4">Original Size</th>
                <th className="text-left py-2 px-4">Compressed Size</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map(image => (
                <tr key={image.id} className="border-b">
                  <td className="py-2 px-4">
                    <Image src={URL.createObjectURL(image.file)} alt={image.file.name} width={50} height={50} className="rounded" />
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center">
                      <span className={`mr-2 px-2 py-1 rounded-full text-xs font-semibold ${getFormatLabelColor(getFormatLabel(image.file.name))}`}>
                        {getFormatLabel(image.file.name)}
                      </span>
                      <span title={image.file.name}>{truncateFileName(image.file.name, 20)}</span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-sm text-gray-600">{image.originalSize}</td>
                  <td className="py-2 px-4 text-sm text-gray-600">
                    {image.status === 'compressing' && 'Compressing...'}
                    {image.status === 'done' && (
                      <>
                        {image.compressedSize} <span className="text-green-600">(-{image.compressionRatio}%)</span>
                      </>
                    )}
                    {image.status === 'error' && 'Error'}
                  </td>
                  <td className="py-2 px-4">
                    {image.status === 'done' && (
                      <a 
                        href={image.compressedUrl} 
                        download={`compressed_${image.file.name}`}
                        className="inline-block p-2 rounded-full bg-gray-200 hover:bg-green-500 transition-colors duration-200"
                        title={`Download compressed ${image.file.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 hover:text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="py-2 px-4" colSpan={2}>Total</td>
                <td className="py-2 px-4">{formatFileSize(totalStats.original)}</td>
                <td className="py-2 px-4">
                  {formatFileSize(totalStats.compressed)} <span className="text-green-600">(-{totalStats.saved.toFixed(2)}%)</span>
                </td>
                <td className="py-2 px-4">
                  <button 
                    onClick={downloadAll} 
                    className="inline-block p-2 rounded-full bg-gray-200 hover:bg-green-500 transition-colors duration-200"
                    title="Download All Compressed Images as ZIP"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 hover:text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                      <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
