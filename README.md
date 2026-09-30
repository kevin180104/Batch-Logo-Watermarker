# ⚡ Batch Logo Watermarker Pro — DuongLV Edition

> Công cụ gắn logo/watermark hàng loạt lên ảnh với giao diện Neon Cyberpunk.
> Hỗ trợ cả **Web App** (React + Vite) và **Desktop App** (Python + Tkinter).

## ✨ Tính năng chính

- ⚡ **Tải lên & Tự động gán logo file ZIP** — Tải lên hoặc kéo thả file `.zip`, hệ thống tự động giải nén, gán watermark lên toàn bộ ảnh và xuất file ZIP thành phẩm
- 📁 **Tải về 1-chạm & tự động tạo thư mục** — Chỉ 1 nút bấm duy nhất: Hệ thống tự động đóng dấu toàn bộ ảnh, đóng gói vào thư mục mang đúng tên file ZIP (hoặc tùy chỉnh) và tự động tải về ngay, loại bỏ toàn bộ các bước xác nhận rườm rà
- 🖼️ **Gắn logo hàng loạt** — Xử lý toàn bộ danh sách ảnh chỉ với 1 click
- 🎨 **Giao diện Neon Cyberpunk** — Thiết kế đẹp mắt, hiện đại
- 📍 **9 vị trí logo** — Chọn vị trí đặt logo trên ảnh (3×3 grid)
- 🔲 **Điều chỉnh Opacity** — Tùy chỉnh độ trong suốt từ 10% → 100%
- 📦 **Xuất file ZIP chất lượng cao** — Tự động đóng gói tất cả ảnh đã gắn logo với cấu trúc thư mục chuẩn
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