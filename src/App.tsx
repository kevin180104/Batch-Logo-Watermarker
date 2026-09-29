/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Batch Logo Watermarker Pro - DuongLV Edition
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  FolderOpen,
  Sparkles,
  Zap,
  Download,
  Trash2,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Crosshair,
  BadgeCheck,
  FileImage,
  SlidersHorizontal,
  Sliders,
  Info,
  Eye,
  FolderOutput,
  Archive,
  FolderDown
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Position, ProcessState } from './types';
import { processImage } from './utils/imageProcess';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [images, setImages] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [logo, setLogo] = useState<File | null>(null);
  const [useDefaultLogo, setUseDefaultLogo] = useState<boolean>(true);
  
  // Export mode: 'zip' or 'folder'
  const [exportMode, setExportMode] = useState<'zip' | 'folder'>('folder');

  // Opacity state (default 60% = 0.6)
  const [opacity, setOpacity] = useState<number>(0.6);

  // Position settings
  const [selectedAnchor, setSelectedAnchor] = useState<'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [isPadded, setIsPadded] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>('bottom-right-edge');

  const [processState, setProcessState] = useState<ProcessState>({
    isProcessing: false,
    progress: 0,
    total: 0,
    current: 0,
    message: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const directoryInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Store the writable directory handle when user selects a folder via showDirectoryPicker
  const sourceDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [sourceFolderName, setSourceFolderName] = useState<string>('');

  // Sync position string whenever anchor or padding mode changes
  useEffect(() => {
    if (selectedAnchor === 'center') {
      setPosition('center');
    } else {
      const mode = isPadded ? 'padded' : 'edge';
      setPosition(`${selectedAnchor}-${mode}` as Position);
    }
  }, [selectedAnchor, isPadded]);

  // Update preview when position, logo, opacity, or selected image changes
  useEffect(() => {
    if (images.length > 0) {
      updatePreviewForIndex(currentImageIndex);
    }
  }, [position, logo, useDefaultLogo, opacity]);

  // Pick a folder using the modern File System Access API (gives writable handle)
  const handleDirectoryPick = async () => {
    if (processState.isProcessing) return;
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      sourceDirHandleRef.current = dirHandle;
      setSourceFolderName(dirHandle.name);

      // Read all image files from the directory
      const filesList: File[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file: File = await entry.getFile();
          if (file.type.startsWith('image/')) {
            filesList.push(file);
          }
        }
      }

      if (filesList.length === 0) {
        setErrorMsg('Thư mục đã chọn không chứa tệp ảnh hợp lệ.');
        sourceDirHandleRef.current = null;
        setSourceFolderName('');
        return;
      }

      setImages(filesList);
      setCurrentImageIndex(0);
      setErrorMsg('');
      setSuccessMsg(`Đã nạp ${filesList.length} ảnh từ thư mục "${dirHandle.name}" (có quyền ghi)`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      // Fallback: use the old webkitdirectory input
      directoryInputRef.current?.click();
    }
  };

  // Fallback handler for <input webkitdirectory> (no writable handle)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = (Array.from(e.target.files) as File[]).filter(file => file.type.startsWith('image/'));
      if (selectedFiles.length === 0) {
        setErrorMsg('Không tìm thấy tệp ảnh hợp lệ (.jpg, .png, .webp...).');
        return;
      }
      sourceDirHandleRef.current = null;
      setSourceFolderName('');
      setImages(selectedFiles);
      setCurrentImageIndex(0);
      setErrorMsg('');
      setSuccessMsg(`Đã tải thành công ${selectedFiles.length} hình ảnh vào hàng đợi!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      if (e.target.value) e.target.value = '';
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('File logo phải có định dạng ảnh (.png, .jpg, .svg).');
        return;
      }
      setLogo(file);
      setUseDefaultLogo(false);
      setErrorMsg('');
      setSuccessMsg(`Đã nạp logo tùy chỉnh: ${file.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const [isDragOverImages, setIsDragOverImages] = useState(false);
  const [isDragOverLogo, setIsDragOverLogo] = useState(false);

  const handleImagesDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverImages(false);
    if (processState.isProcessing) return;

    try {
      if (e.dataTransfer.items) {
        const items = Array.from(e.dataTransfer.items) as DataTransferItem[];
        const filesList: File[] = [];

        const traverseEntry = async (entry: any) => {
          if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
            if (file.type.startsWith('image/')) {
              filesList.push(file);
            }
          } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const readEntries = async () => {
              const entries = await new Promise<any[]>((resolve, reject) => reader.readEntries(resolve, reject));
              if (entries.length > 0) {
                for (const childEntry of entries) {
                  await traverseEntry(childEntry);
                }
                await readEntries();
              }
            };
            await readEntries();
          }
        };

        for (const item of items) {
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              await traverseEntry(entry);
            }
          }
        }

        if (filesList.length > 0) {
          setImages(filesList);
          setCurrentImageIndex(0);
          setErrorMsg('');
          setSuccessMsg(`Đã nạp ${filesList.length} ảnh từ thư mục kéo thả!`);
          setTimeout(() => setSuccessMsg(''), 4000);
        } else {
          setErrorMsg('Không tìm thấy tệp ảnh hợp lệ trong dữ liệu kéo thả.');
        }
      } else if (e.dataTransfer.files) {
        const selectedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(file => file.type.startsWith('image/'));
        if (selectedFiles.length > 0) {
          setImages(selectedFiles);
          setCurrentImageIndex(0);
          setErrorMsg('');
          setSuccessMsg(`Đã nạp ${selectedFiles.length} hình ảnh!`);
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kéo thả thư mục: ${err.message}`);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(false);
    if (processState.isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setLogo(file);
        setUseDefaultLogo(false);
        setErrorMsg('');
        setSuccessMsg(`Đã nạp logo tùy chỉnh: ${file.name}`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('File logo phải có định dạng ảnh (.png, .jpg, .jpeg).');
      }
    }
  };

  const updatePreviewForIndex = async (index: number) => {
    if (images.length === 0 || !images[index]) return;
    setIsPreviewLoading(true);
    try {
      const activeLogo = useDefaultLogo ? null : logo;
      const blob = await processImage(images[index], activeLogo, position, opacity);
      const url = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (e: any) {
      setErrorMsg(`Lỗi khi tạo hình xem trước: ${e.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const generatePreview = () => {
    if (images.length === 0) {
      setErrorMsg('Vui lòng chọn hoặc kéo thả ảnh vào ứng dụng trước khi xem trước!');
      return;
    }
    setErrorMsg('');
    const randomIndex = Math.floor(Math.random() * images.length);
    setCurrentImageIndex(randomIndex);
    updatePreviewForIndex(randomIndex);
  };

  const handleNextPreview = () => {
    if (images.length <= 1) return;
    const nextIdx = (currentImageIndex + 1) % images.length;
    setCurrentImageIndex(nextIdx);
    updatePreviewForIndex(nextIdx);
  };

  const handlePrevPreview = () => {
    if (images.length <= 1) return;
    const prevIdx = (currentImageIndex - 1 + images.length) % images.length;
    setCurrentImageIndex(prevIdx);
    updatePreviewForIndex(prevIdx);
  };

  const startProcessing = async () => {
    if (images.length === 0) {
      setErrorMsg('Vui lòng nạp danh sách ảnh cần gắn logo!');
      return;
    }

    if (exportMode === 'folder') {
      await startProcessingToFolder();
    } else {
      await startProcessingToZip();
    }
  };

  const startProcessingToFolder = async () => {
    const parentDir = sourceDirHandleRef.current;
    if (!parentDir) {
      setErrorMsg('Không có quyền ghi vào thư mục gốc. Hãy chọn lại thư mục bằng nút "Chọn Thư Mục" hoặc chuyển sang chế độ tải ZIP.');
      return;
    }

    setProcessState({
      isProcessing: true,
      progress: 0,
      total: images.length,
      current: 0,
      message: `Đang tạo thư mục daganlogo trong "${parentDir.name}"...`
    });
    setErrorMsg('');
    setSuccessMsg('');

    let success = 0;
    const activeLogo = useDefaultLogo ? null : logo;

    try {
      // Tạo thư mục con "daganlogo" bên trong thư mục gốc
      const outputDir = await parentDir.getDirectoryHandle('daganlogo', { create: true });

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const outputName = `${nameWithoutExt}_watermarked.jpg`;

        setProcessState(prev => ({
          ...prev,
          current: i + 1,
          message: `Đang lưu [${i + 1}/${images.length}]: daganlogo/${outputName}`
        }));

        try {
          const resultBlob = await processImage(file, activeLogo, position, opacity);
          const fileHandle = await outputDir.getFileHandle(outputName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(resultBlob);
          await writable.close();
          success++;
        } catch (imgError: any) {
          console.error(`Lỗi lưu ${file.name}:`, imgError);
        }

        setProcessState(prev => ({
          ...prev,
          progress: ((i + 1) / images.length) * 100
        }));
      }

      setProcessState(prev => ({
        ...prev,
        isProcessing: false,
        message: `Đã lưu ${success}/${images.length} ảnh vào "${parentDir.name}/daganlogo/"!`,
        progress: 100,
      }));

      setSuccessMsg(`Đã lưu ${success} ảnh vào thư mục "${parentDir.name}/daganlogo/" (Opacity ${Math.round(opacity * 100)}%)`);
    } catch (err: any) {
      setErrorMsg(`Lỗi khi lưu vào thư mục: ${err.message}`);
      setProcessState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const startProcessingToZip = async () => {
    setProcessState({
      isProcessing: true,
      progress: 0,
      total: images.length,
      current: 0,
      message: 'Khởi tạo tiến trình xử lý hàng loạt...'
    });
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const zip = new JSZip();
      const folder = zip.folder('daganlogo_DuongLV');
      if (!folder) throw new Error("Lỗi khi tạo gói lưu trữ ZIP");

      const activeLogo = useDefaultLogo ? null : logo;

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        setProcessState(prev => ({
          ...prev,
          current: i + 1,
          message: `Đang gắn logo [${i + 1}/${images.length}]: ${file.name}`
        }));

        try {
          const resultBlob = await processImage(file, activeLogo, position, opacity);
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          folder.file(`${nameWithoutExt}_watermarked.jpg`, resultBlob);
        } catch (imgError: any) {
          console.error("Lỗi với một ảnh:", imgError);
        }
        
        setProcessState(prev => ({
          ...prev,
          progress: ((i + 1) / images.length) * 100
        }));
      }

      setProcessState(prev => ({
        ...prev,
        message: 'Đang đóng gói file ZIP chất lượng cao...',
      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        if (metadata.percent) {
          setProcessState(prev => ({
            ...prev,
            message: `Nén dữ liệu ZIP: ${Math.round(metadata.percent)}%`
          }));
        }
      });
      
      saveAs(zipBlob, `Watermarked_Images_DuongLV_${Date.now()}.zip`);

      setProcessState(prev => ({
        ...prev,
        isProcessing: false,
        message: 'Đã hoàn tất toàn bộ ảnh!',
        progress: 100,
      }));

      setSuccessMsg(`Xuất ZIP thành công ${images.length} ảnh đã gắn logo bản quyền DuongLV (Độ mờ ${Math.round(opacity * 100)}%)!`);
    } catch (err: any) {
      setErrorMsg(`Có lỗi xảy ra: ${err.message}`);
      setProcessState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleDownloadSingle = () => {
    if (!previewUrl) return;
    const currentName = images[currentImageIndex]?.name || 'watermarked.jpg';
    const nameWithoutExt = currentName.substring(0, currentName.lastIndexOf('.')) || currentName;
    saveAs(previewUrl, `${nameWithoutExt}_watermark_DuongLV.jpg`);
  };

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col justify-between relative selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden font-sans">
      
      {/* Dynamic Ambient Neon Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none -z-10 animate-pulse-slow" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-fuchsia-600/10 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-[40%] right-[30%] w-[35vw] h-[35vw] rounded-full bg-blue-600/8 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed inset-0 cyber-dots opacity-40 pointer-events-none -z-10" />

      {/* Floating Notifications */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -25, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1f0e1a]/95 backdrop-blur-md border border-rose-500/80 text-rose-200 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(244,63,94,0.35)]"
          >
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium tracking-wide">{errorMsg}</p>
            <button 
              onClick={() => setErrorMsg('')} 
              className="ml-2 text-rose-400/80 hover:text-white text-xs px-2 py-1 rounded bg-white/5"
            >
              Đóng
            </button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -25, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#071d18]/95 backdrop-blur-md border border-emerald-400/80 text-emerald-200 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium tracking-wide">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="flex-1 max-w-[1560px] w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col">
        
        {/* Main Application Window Frame */}
        <div className="flex-1 flex flex-col bg-[#0b0f1e]/85 backdrop-blur-2xl border border-cyan-500/25 rounded-3xl shadow-[0_0_60px_rgba(0,240,255,0.08),0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden">
          
          {/* Neon Cyber Header */}
          <header className="min-h-16 bg-[#0e1329]/90 border-b border-cyan-500/20 px-5 py-3 flex flex-wrap items-center justify-between gap-4 relative z-30">
            
            {/* Left: Window Dots & App Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              </div>

              <div className="h-6 w-px bg-cyan-500/20 mx-1 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 p-[1px] shadow-[0_0_15px_rgba(0,240,255,0.5)]">
                  <div className="w-full h-full bg-[#0b0f1e] rounded-[11px] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-cyan-300" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base sm:text-lg tracking-wider bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-400 bg-clip-text text-transparent">
                      BATCH WATERMARK PRO
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 tracking-widest font-semibold shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                      NEON v2.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono hidden md:block">
                    Hệ thống đóng dấu bản quyền EXIF & logo hàng loạt tốc độ cao
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Author Branding Pill "DuongLV" */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-400 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500" />
                <div className="relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#090d20] border border-cyan-400/40 text-xs shadow-lg">
                  <div className="relative flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-400">Tác giả:</span>
                    <span className="text-cyan-300 font-bold tracking-wide font-mono text-sm">
                      DuongLV
                    </span>
                  </div>
                  <BadgeCheck className="w-4 h-4 text-cyan-400" />
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-[11px] text-slate-400 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Canvas GPU Ready</span>
              </div>
            </div>

          </header>

          {/* Main App Layout: Two Columns (Controls & Preview) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* Hidden File Inputs */}
            <input 
              type="file" 
              ref={directoryInputRef} 
              onChange={handleImageSelect} 
              multiple 
              {...({ webkitdirectory: "", directory: "" } as any)}
              className="hidden" 
            />
            <input 
              type="file" 
              ref={filesInputRef} 
              onChange={handleImageSelect} 
              multiple 
              accept="image/*"
              className="hidden" 
            />
            <input 
              type="file" 
              ref={logoInputRef} 
              onChange={handleLogoSelect} 
              accept="image/png, image/jpeg, image/webp" 
              className="hidden" 
            />

            {/* LEFT SIDEBAR: Controls & Settings */}
            <aside className="w-full lg:w-[420px] xl:w-[460px] bg-[#090d1f]/95 border-r border-cyan-500/20 p-5 lg:p-6 flex flex-col justify-between overflow-y-auto z-20 space-y-5">
              
              <div className="space-y-5">
                
                {/* SECTION 1: Duyệt & Nạp Ảnh */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2 font-mono">
                      <FolderOpen className="w-4 h-4 text-cyan-400" />
                      1. Nguồn Ảnh ({images.length})
                    </label>
                    {images.length > 0 && (
                      <button 
                        onClick={() => { setImages([]); setPreviewUrl(null); sourceDirHandleRef.current = null; setSourceFolderName(''); }}
                        disabled={processState.isProcessing}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Xóa danh sách
                      </button>
                    )}
                  </div>

                  {/* Dropzone & Browse Card */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverImages(true); }}
                    onDragLeave={() => setIsDragOverImages(false)}
                    onDrop={handleImagesDrop}
                    className={`relative rounded-2xl border transition-all duration-300 p-3.5 ${
                      isDragOverImages 
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_25px_rgba(0,240,255,0.35)] scale-[1.01]' 
                        : images.length > 0 
                          ? 'border-cyan-500/40 bg-[#0d142c]/70 hover:border-cyan-400/70' 
                          : 'border-slate-700/60 bg-[#0d1226]/50 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl transition-all ${images.length > 0 ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-slate-800 text-slate-400'}`}>
                          <FileImage className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h4 className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
                            {images.length > 0 ? `Đã nạp ${images.length} tệp ảnh` : 'Chưa chọn ảnh nào'}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {images.length > 0 
                              ? sourceFolderName 
                                ? `📁 ${sourceFolderName} (có quyền ghi) — ${images[currentImageIndex]?.name || ''}` 
                                : `Đang xem: ${images[currentImageIndex]?.name || 'N/A'}`
                              : 'Kéo thả thư mục hoặc chọn bên dưới'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Browse Buttons Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleDirectoryPick}
                          disabled={processState.isProcessing}
                          className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 hover:border-cyan-400 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)] active:scale-95 disabled:opacity-50"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Chọn Thư Mục
                        </button>
                        <button
                          type="button"
                          onClick={() => filesInputRef.current?.click()}
                          disabled={processState.isProcessing}
                          className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          Chọn Nhiều File
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Cấu Hình Logo Watermark */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-fuchsia-400 tracking-wider uppercase flex items-center gap-2 font-mono">
                      <Layers className="w-4 h-4 text-fuchsia-400" />
                      2. Logo Đóng Dấu
                    </label>
                    <span className="text-[10px] text-fuchsia-400/80 font-mono">
                      {useDefaultLogo ? 'Logo DuongLV' : 'Logo Tự Tải'}
                    </span>
                  </div>

                  {/* Logo Options Box */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverLogo(true); }}
                    onDragLeave={() => setIsDragOverLogo(false)}
                    onDrop={handleLogoDrop}
                    className={`rounded-2xl border p-3.5 transition-all duration-300 ${
                      isDragOverLogo 
                        ? 'border-fuchsia-400 bg-fuchsia-950/40 shadow-[0_0_25px_rgba(217,70,239,0.35)] scale-[1.01]' 
                        : !useDefaultLogo 
                          ? 'border-fuchsia-500/40 bg-[#170e28]/70' 
                          : 'border-slate-700/60 bg-[#0d1226]/50'
                    }`}
                  >
                    {/* Toggle between Default DuongLV logo and Custom */}
                    <div className="grid grid-cols-2 p-1 bg-black/40 rounded-xl border border-white/5 mb-2.5">
                      <button
                        type="button"
                        onClick={() => { setUseDefaultLogo(true); }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                          useDefaultLogo 
                            ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] font-bold' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Logo DuongLV
                      </button>
                      <button
                        type="button"
                        onClick={() => { 
                          if (!logo) {
                            logoInputRef.current?.click();
                          } else {
                            setUseDefaultLogo(false);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                          !useDefaultLogo 
                            ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] font-bold' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Logo Tùy Chọn
                      </button>
                    </div>

                    {useDefaultLogo ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-fuchsia-950/30 border border-fuchsia-500/20">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center text-fuchsia-300 font-black text-xs font-mono">
                            DL
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                              Logo Chuẩn DuongLV
                              <span className="text-[9px] px-1.5 py-0.2 bg-fuchsia-500/20 text-fuchsia-300 rounded border border-fuchsia-500/30">Auto 20%</span>
                            </div>
                            <div className="text-[10px] text-fuchsia-300/70 font-mono">
                              EXIF: DuongLV • © 2026
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-purple-950/30 border border-purple-500/20">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-100 truncate">
                              {logo ? logo.name : 'Chưa chọn file logo'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {logo ? `${(logo.size / 1024).toFixed(1)} KB` : 'Nhấn nút để tải tệp'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 text-xs border border-fuchsia-400/30 font-medium"
                        >
                          Đổi
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: Tùy Chỉnh Độ Trong Suốt (Opacity) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-2 font-mono">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      3. Độ Trong Suốt (Opacity)
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0d1226]/50 border border-slate-700/60 space-y-3">
                    {/* Range slider */}
                    <div className="space-y-1.5">
                      <input 
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={Math.round(opacity * 100)}
                        onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
                        <span>10% (Rất mờ)</span>
                        <span>50%</span>
                        <span>100% (Đậm nét)</span>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/5">
                      {[
                        { label: '30% Mờ', val: 0.3 },
                        { label: '60% Chuẩn', val: 0.6 },
                        { label: '80% Rõ', val: 0.8 },
                        { label: '100% Đậm', val: 1.0 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setOpacity(preset.val)}
                          className={`py-1 px-1 rounded-lg text-[10px] font-mono transition-all ${
                            Math.round(opacity * 100) === Math.round(preset.val * 100)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Vị Trí Watermark (Interactive Cyber Matrix) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-2 font-mono">
                      <Crosshair className="w-4 h-4 text-amber-400" />
                      4. Vị Trí Watermark
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono capitalize">
                      {selectedAnchor} ({isPadded ? 'Thụt lề' : 'Sát mép'})
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#0d1226]/50 border border-slate-700/60 space-y-3">
                    
                    {/* Visual 3x3 Matrix Grid */}
                    <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto p-1.5 bg-[#060914] rounded-xl border border-white/5 shadow-inner">
                      {/* Top-Left */}
                      <button
                        type="button"
                        onClick={() => setSelectedAnchor('top-left')}
                        className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                          selectedAnchor === 'top-left'
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.7)] scale-95'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Trên - Trái"
                      >
                        <span className="text-[10px] font-mono">TL</span>
                      </button>

                      {/* Top-Center (Inactive placeholder) */}
                      <div className="h-10 rounded-lg border border-dashed border-slate-800 flex items-center justify-center opacity-30">
                        <span className="text-[9px] text-slate-600 font-mono">•</span>
                      </div>

                      {/* Top-Right */}
                      <button
                        type="button"
                        onClick={() => setSelectedAnchor('top-right')}
                        className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                          selectedAnchor === 'top-right'
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.7)] scale-95'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Trên - Phải"
                      >
                        <span className="text-[10px] font-mono">TR</span>
                      </button>

                      {/* Center-Left (Inactive placeholder) */}
                      <div className="h-10 rounded-lg border border-dashed border-slate-800 flex items-center justify-center opacity-30">
                        <span className="text-[9px] text-slate-600 font-mono">•</span>
                      </div>

                      {/* Center */}
                      <button
                        type="button"
                        onClick={() => setSelectedAnchor('center')}
                        className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                          selectedAnchor === 'center'
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.7)] scale-95'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Chính giữa ảnh (Center)"
                      >
                        <span className="text-[10px] font-mono">CTR</span>
                      </button>

                      {/* Center-Right (Inactive placeholder) */}
                      <div className="h-10 rounded-lg border border-dashed border-slate-800 flex items-center justify-center opacity-30">
                        <span className="text-[9px] text-slate-600 font-mono">•</span>
                      </div>

                      {/* Bottom-Left */}
                      <button
                        type="button"
                        onClick={() => setSelectedAnchor('bottom-left')}
                        className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                          selectedAnchor === 'bottom-left'
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.7)] scale-95'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Dưới - Trái"
                      >
                        <span className="text-[10px] font-mono">BL</span>
                      </button>

                      {/* Bottom-Center (Inactive placeholder) */}
                      <div className="h-10 rounded-lg border border-dashed border-slate-800 flex items-center justify-center opacity-30">
                        <span className="text-[9px] text-slate-600 font-mono">•</span>
                      </div>

                      {/* Bottom-Right */}
                      <button
                        type="button"
                        onClick={() => setSelectedAnchor('bottom-right')}
                        className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                          selectedAnchor === 'bottom-right'
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.7)] scale-95'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Dưới - Phải"
                      >
                        <span className="text-[10px] font-mono">BR</span>
                      </button>
                    </div>

                    {/* Edge vs Padded Pill Toggle */}
                    {selectedAnchor !== 'center' && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                          Khoảng cách viền:
                        </span>
                        <div className="flex bg-[#060914] p-0.5 rounded-lg border border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsPadded(false)}
                            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                              !isPadded 
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,240,255,0.2)] font-semibold' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Sát mép
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsPadded(true)}
                            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                              isPadded 
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,240,255,0.2)] font-semibold' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Thụt vào (Padded)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* SECTION 5: Chế Độ Xuất & Nút Xử Lý */}
              <div className="pt-3 border-t border-cyan-500/20 space-y-3">

                {/* Export Mode Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-sky-400 tracking-wider uppercase flex items-center gap-2 font-mono">
                    <FolderOutput className="w-4 h-4 text-sky-400" />
                    5. Chế Độ Lưu
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportMode('folder')}
                      disabled={processState.isProcessing}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                        exportMode === 'folder'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_15px_rgba(14,165,233,0.3)] font-bold'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white hover:bg-slate-700'
                      } disabled:opacity-50`}
                    >
                      <FolderDown className="w-4 h-4" />
                      <div className="text-left">
                        <div>Lưu Vào Thư Mục</div>
                        <div className={`text-[10px] font-normal mt-0.5 ${
                          exportMode === 'folder' ? 'text-sky-400/70' : 'text-slate-500'
                        }`}>Ghi file .jpg trực tiếp</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportMode('zip')}
                      disabled={processState.isProcessing}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                        exportMode === 'zip'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_15px_rgba(14,165,233,0.3)] font-bold'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white hover:bg-slate-700'
                      } disabled:opacity-50`}
                    >
                      <Archive className="w-4 h-4" />
                      <div className="text-left">
                        <div>Tải File ZIP</div>
                        <div className={`text-[10px] font-normal mt-0.5 ${
                          exportMode === 'zip' ? 'text-sky-400/70' : 'text-slate-500'
                        }`}>Đóng gói & download</div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Progress Indicator */}
                {processState.isProcessing && (
                  <div className="p-3.5 rounded-2xl bg-[#0e1633] border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.15)] space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono font-semibold">
                      <span className="text-cyan-300 truncate max-w-[260px] animate-pulse">
                        {processState.message}
                      </span>
                      <span className="text-cyan-400 font-bold">
                        {Math.round(processState.progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-cyan-500/30">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${processState.progress}%` }}
                        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.8)]"
                      />
                    </div>
                  </div>
                )}

                {/* Big Neon Action Button */}
                <button 
                  onClick={startProcessing}
                  disabled={processState.isProcessing || images.length === 0}
                  className={`w-full relative overflow-hidden group py-4 px-6 rounded-2xl text-white font-extrabold text-base tracking-wider transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-3 border border-white/20 cursor-pointer ${
                    exportMode === 'folder'
                      ? 'bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 hover:from-sky-400 hover:via-blue-500 hover:to-cyan-400 shadow-[0_0_30px_rgba(14,165,233,0.4),0_0_60px_rgba(0,240,255,0.2)]'
                      : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 hover:from-cyan-400 hover:via-blue-500 hover:to-fuchsia-500 shadow-[0_0_30px_rgba(0,240,255,0.4),0_0_60px_rgba(217,70,239,0.2)]'
                  }`}
                >
                  {/* Animated Shine bar */}
                  <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] animate-shine pointer-events-none" />

                  <div className="p-1 rounded-full bg-white/20">
                    {exportMode === 'folder'
                      ? <FolderDown className="w-5 h-5 text-white" />
                      : <Zap className="w-5 h-5 text-white fill-white" />
                    }
                  </div>
                  <span className="drop-shadow-md">
                    {processState.isProcessing 
                      ? 'ĐANG XỬ LÝ HÀNG LOẠT...' 
                      : exportMode === 'folder'
                        ? `LƯU VÀO THƯ MỤC (${images.length} ẢNH)`
                        : `TẢI ZIP (${images.length} ẢNH)`
                    }
                  </span>
                </button>

                <p className="text-center text-[11px] text-slate-500 font-mono">
                  {exportMode === 'folder' 
                    ? sourceFolderName 
                      ? `📁 Lưu vào: ${sourceFolderName}/daganlogo/ — tự động tạo thư mục con`
                      : '📁 Chọn thư mục ảnh gốc → tạo thư mục daganlogo/ & ghi file vào đó'
                    : '⚡ Tự động đóng gói ZIP & chèn thẻ EXIF Author: DuongLV'
                  }
                </p>
              </div>

            </aside>

            {/* RIGHT WORKSPACE: Live Preview Monitor */}
            <main className="flex-1 bg-[#060814]/90 p-4 sm:p-6 lg:p-8 flex flex-col justify-between overflow-hidden relative">
              
              {/* Cyber Monitor Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-cyan-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
                    MÀN HÌNH XEM TRƯỚC (PREVIEW HUD)
                  </h3>
                </div>

                {images.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-300 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30">
                      Ảnh {currentImageIndex + 1} / {images.length}
                    </span>

                    <button
                      type="button"
                      onClick={handlePrevPreview}
                      disabled={images.length <= 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40"
                      title="Ảnh trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextPreview}
                      disabled={images.length <= 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40"
                      title="Ảnh tiếp theo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* High-Tech Preview Canvas Viewport */}
              <div className="flex-1 min-h-[380px] bg-[#04060d] rounded-2xl border border-cyan-500/30 flex items-center justify-center p-4 relative overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
                
                {/* Cyber Corner Crosshairs */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

                {/* Cyber Scanline Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none" />

                {/* Image or Empty State */}
                {isPreviewLoading ? (
                  <div className="flex flex-col items-center gap-3 text-cyan-300 animate-pulse">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-mono tracking-wider">ĐANG RENDER WATERMARK ({Math.round(opacity * 100)}%)...</span>
                  </div>
                ) : previewUrl ? (
                  <div className="relative max-w-full max-h-full flex items-center justify-center">
                    <img 
                      src={previewUrl} 
                      alt="Watermarked Preview" 
                      className="max-w-full max-h-[58vh] object-contain rounded-lg drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)] border border-white/10" 
                    />
                    
                    {/* Watermark position & opacity tag */}
                    <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur px-3 py-1 rounded-md text-[10px] font-mono border border-cyan-500/30 flex items-center gap-2 shadow-lg">
                      <span className="text-cyan-300">Vị trí: {position}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-300 font-semibold">Độ mờ: {Math.round(opacity * 100)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md p-6">
                    <div className="w-20 h-20 rounded-3xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.15)] text-cyan-400">
                      <ImageIcon className="w-10 h-10 opacity-70" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-200 text-base">
                        Chưa có ảnh xem trước
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Hãy nạp thư mục ảnh ở cột bên trái và nhấn <span className="text-cyan-300 font-semibold">'Xem trước ngẫu nhiên'</span> để kiểm tra vị trí & độ trong suốt logo trước khi xuất hàng loạt.
                      </p>
                    </div>
                    {images.length > 0 && (
                      <button
                        onClick={generatePreview}
                        className="mt-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                      >
                        Tạo xem trước ngay
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Action Toolbar */}
              <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-cyan-500/20">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Logo tự co giãn 20% chiều ngang • Độ mờ tùy chỉnh</span>
                </div>

                <div className="flex items-center gap-2.5">
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadSingle}
                      className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      Lưu Ảnh Này (.JPG)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={generatePreview}
                    disabled={images.length === 0 || processState.isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 hover:border-cyan-300 text-cyan-200 text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)] active:scale-95 disabled:opacity-40"
                  >
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    Xem Trước Ngẫu Nhiên
                  </button>
                </div>
              </div>

            </main>

          </div>

          {/* Cyber Neon Footer */}
          <footer className="h-11 bg-[#090d20] border-t border-cyan-500/20 px-6 flex items-center justify-between text-xs text-slate-400 relative z-10 font-mono">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-semibold">© 2026 DuongLV</span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-slate-400">Batch Logo Watermarker Studio</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30 text-[11px]">
                <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>EXIF Artist: DuongLV</span>
              </div>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                Made with ⚡ by DuongLV
              </span>
            </div>
          </footer>

        </div>

      </div>

    </div>
  );
}
