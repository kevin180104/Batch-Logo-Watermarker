import { Position } from '../types';
import * as piexif from 'piexifjs';

const createDefaultLogo = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Outer geometric ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(250, 250, 210, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed accent ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(250, 250, 192, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Decorative stars / symbols
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦  OFFICIAL WATERMARK  ✦', 250, 145);

    // Primary Author Name DUONGLV
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Outfit", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DUONGLV', 250, 215);

    // Center divider line with diamond
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(130, 260);
    ctx.lineTo(235, 260);
    ctx.moveTo(265, 260);
    ctx.lineTo(370, 260);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(250, 260, 4, 0, Math.PI * 2);
    ctx.fill();

    // Subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '600 20px "JetBrains Mono", Arial, monospace';
    ctx.letterSpacing = '3px';
    ctx.fillText('CREATIVE STUDIO', 250, 298);

    // Bottom year badge
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText('• 2026 EDITION •', 250, 340);
  }
  return canvas;
};

export const processImage = async (
  imageFile: File,
  logoFile: File | null,
  position: Position,
  opacity: number = 0.6
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const imgUrl = URL.createObjectURL(imageFile);
    const logoUrl = logoFile ? URL.createObjectURL(logoFile) : '';

    const img = new Image();
    const logo = new Image();

    let imgsLoaded = 0;
    const onImgLoad = () => {
      imgsLoaded++;
      if (imgsLoaded === 2) {
        drawAndResolve();
      }
    };

    img.onload = onImgLoad;
    logo.onload = onImgLoad;
    img.onerror = () => reject(new Error(`Lỗi tải ảnh chính: ${imageFile.name}`));
    img.src = imgUrl;
    if (logoFile) {
      logo.src = logoUrl;
    } else {
      logo.onerror = () => {
        logo.onerror = () => reject(new Error('Lỗi tải logo. Vui lòng kiểm tra lại file logo.'));
        logo.src = createDefaultLogo().toDataURL();
      };
      logo.src = '/default_logo.png';
    }

    const drawAndResolve = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Trình duyệt không hỗ trợ Canvas HTML5'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Tự động Scale: Logo sẽ tự động co giãn bằng 20% kích thước của ảnh gốc (chiều ngang)
      const targetLogoWidth = img.width * 0.20;
      const scale = targetLogoWidth / logo.width;
      const targetLogoHeight = logo.height * scale;

      // Tính Vị trí
      let x = 0;
      let y = 0;
      
      const edgePadding = Math.max(5, img.width * 0.005);
      const innerPadding = Math.max(50, img.width * 0.04);
      
      const getPad = (pos: string) => pos.includes('padded') ? innerPadding : edgePadding;

      switch (position) {
        case 'center':
          x = (img.width - targetLogoWidth) / 2;
          y = (img.height - targetLogoHeight) / 2;
          break;
        case 'top-left-edge':
        case 'top-left-padded':
          x = getPad(position);
          y = getPad(position);
          break;
        case 'top-right-edge':
        case 'top-right-padded':
          x = img.width - targetLogoWidth - getPad(position);
          y = getPad(position);
          break;
        case 'bottom-left-edge':
        case 'bottom-left-padded':
          x = getPad(position);
          y = img.height - targetLogoHeight - getPad(position);
          break;
        case 'bottom-right-edge':
        case 'bottom-right-padded':
          x = img.width - targetLogoWidth - getPad(position);
          y = img.height - targetLogoHeight - getPad(position);
          break;
      }

      // Cải tiến: Độ trong suốt tùy chỉnh (Opacity), Tăng Contrast, Thêm Drop Shadow
      ctx.globalAlpha = Math.max(0.05, Math.min(1.0, opacity));
      ctx.filter = 'contrast(1.25)';
      ctx.shadowColor = `rgba(0, 0, 0, ${Math.min(0.85, opacity * 1.1)})`; // Bóng đen tạo độ nổi theo opacity
      ctx.shadowBlur = Math.max(10, targetLogoWidth * 0.04); // Độ nhòe động theo kích thước
      ctx.shadowOffsetX = Math.max(3, targetLogoWidth * 0.015);
      ctx.shadowOffsetY = Math.max(3, targetLogoWidth * 0.015);

      ctx.drawImage(logo, x, y, targetLogoWidth, targetLogoHeight);

      // Reset styles and filters
      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Clean up URLs to avoid memory leaks
      URL.revokeObjectURL(imgUrl);
      if (logoUrl) URL.revokeObjectURL(logoUrl);

      // Xuất ảnh ra định dạng JPEG với chất lượng 92% dưới dạng DataURL
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      try {
        // Khởi tạo và nhúng EXIF Metadata (Bản quyền)
        const zeroth: any = {};
        // Sử dụng bracket notation để set key linh hoạt hơn nếu piexifjs không enum chuẩn
        // piexif.ImageIFD.Artist = 315, piexif.ImageIFD.Copyright = 33432
        zeroth[piexif.ImageIFD.Artist] = unescape(encodeURIComponent("DuongLV"));
        zeroth[piexif.ImageIFD.Copyright] = unescape(encodeURIComponent("© 2026 DuongLV. All rights reserved."));
        
        const exifObj = { "0th": zeroth };
        const exifBytes = piexif.dump(exifObj);
        
        // Chèn EXIF vào base64
        const newJpegDataUrl = piexif.insert(exifBytes, jpegDataUrl);
        
        // Chuyển DataURL thành Blob
        const byteString = atob(newJpegDataUrl.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
        resolve(blob);
      } catch (err) {
        console.error("Lỗi khi chèn EXIF metadata, fallback về ảnh gốc:", err);
        // Fallback: Nếu piexif lỗi thì lưu ảnh bình thường không có EXIF
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Lỗi tạo Blob khi lưu ảnh'));
          },
          'image/jpeg',
          0.92
        );
      }
    };
  });
};
