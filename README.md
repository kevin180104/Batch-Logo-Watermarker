# ⚡ Batch Logo Watermarker Pro — DuongLV Edition

> Công cụ gắn logo/watermark hàng loạt lên ảnh với giao diện Neon Cyberpunk.
> Hỗ trợ cả **Web App** (React + Vite) và **Desktop App** (Python + Tkinter).

## ✨ Tính năng chính

- 🖼️ **Gắn logo hàng loạt** — Xử lý toàn bộ thư mục ảnh chỉ với 1 click
- 🎨 **Giao diện Neon Cyberpunk** — Thiết kế đẹp mắt, hiện đại
- 📍 **9 vị trí logo** — Chọn vị trí đặt logo trên ảnh (3×3 grid)
- 🔲 **Điều chỉnh Opacity** — Tùy chỉnh độ trong suốt từ 10% → 100%
- 📁 **Lưu trực tiếp vào thư mục** — Tự tạo thư mục `daganlogo/` trong folder gốc
- 📦 **Xuất file ZIP** — Đóng gói tất cả ảnh đã gắn logo
- 🏷️ **EXIF Metadata** — Tự động ghi thông tin tác giả DuongLV vào ảnh

## 🚀 Chạy Web App (React)

**Yêu cầu:** [Node.js](https://nodejs.org/) v18+

```bash
# 1. Clone repository
git clone https://github.com/kevin180104/Batch-Logo-Watermarker.git
cd Batch-Logo-Watermarker

# 2. Cài đặt dependencies
npm install

# 3. Chạy ứng dụng
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`

## 🐍 Chạy Desktop App (Python)

**Yêu cầu:** Python 3.8+

```bash
# 1. Cài đặt thư viện
pip install customtkinter Pillow piexif

# 2. Chạy ứng dụng
python watermark_tool.py
```

## 📂 Cấu trúc dự án

```
Batch-Logo-Watermarker/
├── src/                    # Source code Web App (React)
│   ├── App.tsx             # Giao diện chính
│   ├── index.css           # Neon Cyberpunk styles
│   └── utils/
│       └── imageProcess.ts # Logic xử lý ảnh + EXIF
├── watermark_tool.py       # Desktop App (Python/Tkinter)
├── default_logo.png        # Logo mặc định
├── index.html              # Entry point
├── package.json            # Node.js dependencies
└── README.md
```

## 👨‍💻 Tác giả

**DuongLV** — Thiết kế & phát triển

## 📄 License

Apache-2.0