import customtkinter as ctk
from tkinter import filedialog, messagebox
from tkinterdnd2 import TkinterDnD, DND_FILES
import os
import sys
import subprocess
from PIL import Image, ImageEnhance, ImageFilter
import threading
import random
import piexif
import re

SYSTEM_PROMPT_FANPAGE = """BIÊN TẬP BÀI VIẾT ĐĂNG FANPAGE CƠ QUAN NHÀ NƯỚC

Bạn là biên tập viên truyền thông của cơ quan nhà nước.

Nhiệm vụ của bạn KHÔNG phải viết lại hay chỉnh sửa nội dung bài viết, mà chỉ hỗ trợ trình bày để bài đăng trên Facebook/Fanpage trực quan, dễ đọc và phù hợp với phong cách truyền thông của cơ quan nhà nước.

## Yêu cầu bắt buộc

### 1. Giữ nguyên 100% nội dung gốc
* Không được thêm, bớt, sửa hoặc diễn giải bất kỳ câu, chữ, số liệu, tên riêng, trích dẫn hay thông tin nào.
* Không được sáng tác tiêu đề, kết luận hoặc lời kêu gọi mới.
* Không được thay đổi văn phong của tác giả.

### 2. Chỉ được thực hiện các nội dung sau
* Thêm icon (emoji) phù hợp để phân chia các mục, tạo điểm nhấn và tăng khả năng đọc.
* Bố trí lại xuống dòng, khoảng cách giữa các đoạn để bài viết rõ ràng hơn.
* Chuyển các danh sách thành dạng gạch đầu dòng nếu nội dung gốc vốn đã là danh sách.
* Nhấn mạnh các tiêu đề hoặc mục chính bằng ký hiệu phù hợp (không đổi nội dung).

### 3. Phong cách icon
* Trang trọng, lịch sự, đúng chuẩn truyền thông của cơ quan nhà nước.
* Chỉ sử dụng các icon đơn giản như:
  📢 📌 📍 📋 ✅ ☑️ 🔹 🔸 🔷 🔶 📖 📅 ⏰ 🏛️ 👥 ℹ️ ⚠️
* Không sử dụng icon mang tính giải trí hoặc cảm xúc như 😂 🤣 😍 😘 😎 🤪 💥🔥 (trừ khi xuất hiện trong nội dung gốc).

### 4. Quy tắc trình bày
* Tiêu đề → thêm icon phù hợp.
* Mục lớn → thêm icon thống nhất.
* Danh sách → thêm dấu đầu dòng.
* Thông tin thời gian → 📅 hoặc ⏰.
* Địa điểm → 📍.
* Lưu ý → ⚠️.
* Thông tin liên hệ → ☎️ hoặc 📧 nếu có trong nội dung gốc.

### 5. Liên kết bài viết
Sau khi kết thúc toàn bộ nội dung bài viết, chèn thêm dòng sau và để trống phần liên kết để người dùng tự bổ sung:

**🔗 Xem chi tiết tại:** _______________________________

Không được tự tạo hoặc suy đoán đường dẫn website.

### 6. Hashtag
Ở cuối bài viết, sau phần liên kết, tự động bổ sung từ 03–08 hashtag phù hợp với nội dung bài viết.
Quy tắc:
* Chỉ sử dụng các từ khóa đã xuất hiện trong bài viết hoặc là tên cơ quan, đơn vị, địa phương, chương trình, sự kiện có trong bài.
* Không sáng tác hashtag ngoài phạm vi nội dung bài viết.
* Viết liền không dấu hoặc có dấu theo chuẩn Facebook.
* Hashtag luôn đặt theo thứ tự từ lớn đến nhỏ, ví dụ: #SơnLa → #ChiềngCơi → #TênSựKiệm → #CơQuan → #LĩnhVực.

### 7. Không được
* Viết lại câu cho hay hơn.
* Tóm tắt.
* Mở rộng nội dung.
* Bình luận.
* Phân tích.
* Thêm thông tin không có trong bài gốc.
* Thêm lời kêu gọi tương tác.

### 8. Kết quả đầu ra
Kết quả trả về phải là bài viết hoàn chỉnh, chỉ khác ở:
* Cách trình bày.
* Icon minh họa.
* Phần để trống chèn liên kết bài viết.
* Phần hashtag ở cuối bài."""

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

class WatermarkApp(ctk.CTk, TkinterDnD.DnDWrapper):
    def __init__(self):
        super().__init__()
        
        # Initialize Drag and Drop version
        try:
            self.TkdndVersion = TkinterDnD._require(self)
        except Exception as e:
            print("Failed to initialize TkinterDnD:", e)
            
        self.title("Công cụ Gắn Logo & Biên Tập Fanpage - DuongLV Edition")
        self.geometry("1024x720")
        ctk.set_appearance_mode("dark")
        
        # Biến lưu trữ đường dẫn và danh sách file
        self.folder_path = ""
        self.logo_path = ""
        self.image_files = []
        self.use_default_logo = True
        
        # Cấu hình grid bố cục chính
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=0)
        
        # Tạo Tabview
        self.tabview = ctk.CTkTabview(self, corner_radius=10)
        self.tabview.grid(row=0, column=0, padx=15, pady=(10, 5), sticky="nsew")
        
        self.tab_watermark = self.tabview.add("🖼️ Gắn Logo Hàng Loạt")
        self.tab_editor = self.tabview.add("📝 Biên Tập Bài Viết Fanpage")
        
        # SETUP TAB 1: GẮN LOGO
        self.tab_watermark.grid_columnconfigure(0, weight=1, minsize=360)
        self.tab_watermark.grid_columnconfigure(1, weight=2)
        self.tab_watermark.grid_rowconfigure(0, weight=1)
        
        self.left_panel = ctk.CTkFrame(self.tab_watermark, corner_radius=10, fg_color="#282828")
        self.left_panel.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        self.right_panel = ctk.CTkFrame(self.tab_watermark, corner_radius=10, fg_color="#222222")
        self.right_panel.grid(row=0, column=1, padx=(0, 10), pady=10, sticky="nsew")
        self.right_panel.grid_rowconfigure(1, weight=1)
        self.right_panel.grid_columnconfigure(0, weight=1)
        
        self.setup_left_panel()
        self.setup_right_panel()
        
        # SETUP TAB 2: BIÊN TẬP BÀI VIẾT FANPAGE
        self.setup_editor_tab()
        
        # Đăng ký kéo thả cho Tab 1
        try:
            self.drop_target_register(DND_FILES)
            self.dnd_bind('<<Drop>>', self.handle_drop)
            
            self.left_panel.drop_target_register(DND_FILES)
            self.left_panel.dnd_bind('<<Drop>>', self.handle_drop)
            
            self.right_panel.drop_target_register(DND_FILES)
            self.right_panel.dnd_bind('<<Drop>>', self.handle_drop)
        except Exception as e:
            print("Failed to register DnD targets:", e)
            
        # Footer Bản quyền
        self.footer = ctk.CTkLabel(self, text="© 2026 DuongLV. All Rights Reserved. • Neon Edition", text_color="#00f0ff", font=("Arial", 11, "bold"))
        self.footer.grid(row=1, column=0, pady=(0, 10))
        
    def setup_left_panel(self):
        # 1. Duyệt Thư Mục / File Nén
        self.btn_browse_folder = ctk.CTkButton(self.left_panel, text="1. Duyệt Thư Mục Ảnh", command=self.browse_folder, height=40, fg_color="#1E3438", hover_color="#233D42", text_color="#3AD9DC", font=("Arial", 13, "bold"))
        self.btn_browse_folder.pack(pady=(15, 5), padx=25, fill="x")

        self.btn_browse_archive = ctk.CTkButton(self.left_panel, text="📦 Chọn File Nén (.ZIP, .RAR)", command=self.browse_archive, height=40, fg_color="#1E3438", hover_color="#233D42", text_color="#3AD9DC", font=("Arial", 13, "bold"))
        self.btn_browse_archive.pack(pady=(5, 5), padx=25, fill="x")
        
        self.lbl_folder_info = ctk.CTkLabel(self.left_panel, text="Chưa chọn thư mục hoặc file nén", text_color="gray50", font=("Arial", 12), wraplength=320)
        self.lbl_folder_info.pack(pady=(0, 10), padx=25, anchor="w")
        
        # 2. Chọn Logo
        self.btn_browse_logo = ctk.CTkButton(self.left_panel, text="2. Chọn File Logo", command=self.browse_logo, height=45, fg_color="#2A3639", hover_color="#324145", text_color="#F65C19", font=("Arial", 14, "bold"))
        self.btn_browse_logo.pack(pady=(5, 5), padx=25, fill="x")
        
        self.lbl_logo_info = ctk.CTkLabel(self.left_panel, text="Logo: Mặc định (TT DVTH Phường Chiềng Cơi)", text_color="#F65C19", font=("Arial", 12))
        self.lbl_logo_info.pack(pady=(0, 5), padx=25, anchor="w")
        
        # Hướng dẫn Kéo thả
        self.lbl_dnd_hint = ctk.CTkLabel(self.left_panel, text="💡 Kéo thả Thư mục, File nén (.zip/.rar) hoặc Logo vào đây", text_color="gray50", font=("Arial", 11, "italic"), wraplength=320)
        self.lbl_dnd_hint.pack(pady=(0, 15), padx=25, anchor="w")
        
        # 3. Dropdown Vị trí
        ctk.CTkLabel(self.left_panel, text="Vị trí dán logo:", font=("Arial", 12, "bold")).pack(pady=(5, 5), padx=25, anchor="w")
        self.position_var = ctk.StringVar(value="Dưới - Phải (Sát mép)")
        positions = [
            "Giữa ảnh (Center)",
            "Dưới - Phải (Sát mép)",
            "Dưới - Trái (Sát mép)",
            "Trên - Phải (Sát mép)",
            "Trên - Trái (Sát mép)",
            "Dưới - Phải (Thụt vào một chút)",
            "Dưới - Trái (Thụt vào một chút)",
            "Trên - Phải (Thụt vào một chút)",
            "Trên - Trái (Thụt vào một chút)"
        ]
        self.dropdown_pos = ctk.CTkOptionMenu(self.left_panel, values=positions, variable=self.position_var, fg_color="#3A3A3A", button_color="#2956F4", button_hover_color="#305CFD")
        self.dropdown_pos.pack(pady=5, padx=25, fill="x")
        
        # 3.5 Tùy chỉnh Độ trong suốt (Opacity)
        opacity_header = ctk.CTkFrame(self.left_panel, fg_color="transparent")
        opacity_header.pack(pady=(12, 2), padx=25, fill="x")
        ctk.CTkLabel(opacity_header, text="Độ trong suốt logo (Opacity):", font=("Arial", 12, "bold")).pack(side="left")
        self.lbl_opacity_val = ctk.CTkLabel(opacity_header, text="60%", font=("Arial", 12, "bold"), text_color="#00F0FF")
        self.lbl_opacity_val.pack(side="right")
        
        self.slider_opacity = ctk.CTkSlider(
            self.left_panel, 
            from_=10, 
            to=100, 
            number_of_steps=90, 
            command=self.on_opacity_change,
            button_color="#00F0FF", 
            progress_color="#00F0FF"
        )
        self.slider_opacity.set(60)
        self.slider_opacity.pack(pady=(2, 10), padx=25, fill="x")
        
        # Nút Xem trước (Preview chủ động)
        self.btn_preview = ctk.CTkButton(self.left_panel, text="Xem trước kết quả", command=self.generate_preview, fg_color="#3D3D3D", hover_color="#4D4D4D", height=40, font=("Arial", 13))
        self.btn_preview.pack(pady=(20, 10), padx=25, fill="x")
        
        # Progress Bar
        self.lbl_progress = ctk.CTkLabel(self.left_panel, text="", font=("Arial", 12))
        self.lbl_progress.pack(pady=(0, 5), padx=25, anchor="w")
        
        self.progressbar = ctk.CTkProgressBar(self.left_panel, progress_color="#2FD8DA")
        self.progressbar.set(0)
        self.progressbar.pack(pady=(0, 15), padx=25, fill="x")
        
        # Nút GẮN LOGO
        self.btn_start = ctk.CTkButton(self.left_panel, text="Gắn logo", command=self.start_processing, fg_color="#EE6721", hover_color="#FF7A33", font=("Arial", 18, "bold"), height=55)
        self.btn_start.pack(pady=(0, 20), padx=25, fill="x")

    def on_opacity_change(self, value):
        if hasattr(self, 'lbl_opacity_val'):
            self.lbl_opacity_val.configure(text=f"{int(value)}%")

    def setup_right_panel(self):
        ctk.CTkLabel(self.right_panel, text="XEM TRƯỚC HÌNH ẢNH (PREVIEW MODE)", font=("Arial", 14, "bold"), text_color="white").grid(row=0, column=0, pady=20)
        
        # Vùng chứa ảnh canvas
        self.canvas_frame = ctk.CTkFrame(self.right_panel, fg_color="#1A1A1A", corner_radius=10)
        self.canvas_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=(0, 20))
        self.canvas_frame.grid_rowconfigure(0, weight=1)
        self.canvas_frame.grid_columnconfigure(0, weight=1)
        
        self.preview_canvas = ctk.CTkLabel(self.canvas_frame, text="Nhấn nút 'Xem trước kết quả' để kiểm tra", text_color="gray50", font=("Arial", 13))
        self.preview_canvas.grid(row=0, column=0)

    def setup_editor_tab(self):
        self.tab_editor.grid_columnconfigure((0, 1), weight=1)
        self.tab_editor.grid_rowconfigure(0, weight=1)
        
        # --- Khung trái: Nhập liệu văn bản gốc ---
        editor_left_frame = ctk.CTkFrame(self.tab_editor, corner_radius=10, fg_color="#282828")
        editor_left_frame.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        editor_left_frame.grid_columnconfigure(0, weight=1)
        editor_left_frame.grid_rowconfigure(1, weight=1)
        
        ctk.CTkLabel(editor_left_frame, text="📝 Nhập Văn Bản Bài Viết Gốc:", font=("Arial", 14, "bold"), text_color="white").grid(row=0, column=0, padx=15, pady=(15, 5), sticky="w")
        
        self.txt_editor_input = ctk.CTkTextbox(editor_left_frame, font=("Arial", 13), fg_color="#1E1E1E", text_color="#E0E0E0", wrap="word")
        self.txt_editor_input.grid(row=1, column=0, padx=15, pady=5, sticky="nsew")
        
        # Nút bấm bên trái
        btn_box_left = ctk.CTkFrame(editor_left_frame, fg_color="transparent")
        btn_box_left.grid(row=2, column=0, padx=15, pady=(5, 15), sticky="ew")
        btn_box_left.grid_columnconfigure((0, 1, 2), weight=1)
        
        btn_format = ctk.CTkButton(btn_box_left, text="⚡ Biên Tập & Thêm Icon", command=self.format_fanpage_post, fg_color="#EE6721", hover_color="#FF7A33", font=("Arial", 13, "bold"), height=40)
        btn_format.grid(row=0, column=0, padx=(0, 5), sticky="ew")
        
        btn_copy_prompt = ctk.CTkButton(btn_box_left, text="📋 Copy Prompt AI", command=self.copy_prompt_ai, fg_color="#2956F4", hover_color="#305CFD", font=("Arial", 13, "bold"), height=40)
        btn_copy_prompt.grid(row=0, column=1, padx=5, sticky="ew")
        
        btn_clear = ctk.CTkButton(btn_box_left, text="🗑️ Xóa", command=self.clear_editor_input, fg_color="#3D3D3D", hover_color="#4D4D4D", font=("Arial", 13), height=40, width=70)
        btn_clear.grid(row=0, column=2, padx=(5, 0), sticky="ew")

        # --- Khung phải: Kết quả bài viết ---
        editor_right_frame = ctk.CTkFrame(self.tab_editor, corner_radius=10, fg_color="#222222")
        editor_right_frame.grid(row=0, column=1, padx=(0, 10), pady=10, sticky="nsew")
        editor_right_frame.grid_columnconfigure(0, weight=1)
        editor_right_frame.grid_rowconfigure(1, weight=1)
        
        ctk.CTkLabel(editor_right_frame, text="✨ Kết Quả Sau Khi Biên Tập (Icon & Hashtag):", font=("Arial", 14, "bold"), text_color="#3AD9DC").grid(row=0, column=0, padx=15, pady=(15, 5), sticky="w")
        
        self.txt_editor_output = ctk.CTkTextbox(editor_right_frame, font=("Arial", 13), fg_color="#1A1A1A", text_color="#FFFFFF", wrap="word")
        self.txt_editor_output.grid(row=1, column=0, padx=15, pady=5, sticky="nsew")
        
        # Nút bấm bên phải
        btn_box_right = ctk.CTkFrame(editor_right_frame, fg_color="transparent")
        btn_box_right.grid(row=2, column=0, padx=15, pady=(5, 15), sticky="ew")
        btn_box_right.grid_columnconfigure(0, weight=1)
        
        btn_copy_output = ctk.CTkButton(btn_box_right, text="📋 SAO CHÉP BÀI VIẾT NÀY", command=self.copy_editor_output, fg_color="#2FD8DA", hover_color="#3AD9DC", text_color="#000000", font=("Arial", 14, "bold"), height=40)
        btn_copy_output.pack(fill="x")
        
        self.lbl_editor_status = ctk.CTkLabel(editor_right_frame, text="", font=("Arial", 12))
        self.lbl_editor_status.grid(row=3, column=0, padx=15, pady=(0, 10), sticky="w")

    def format_fanpage_post(self):
        try:
            text = self.txt_editor_input.get("1.0", "end").strip()
            if not text:
                messagebox.showwarning("Nhắc nhở", "Vui lòng nhập nội dung bài viết gốc vào ô bên trái!")
                return
                
            raw_paragraphs = [p.strip() for p in text.strip().split('\n') if p.strip()]
            if not raw_paragraphs:
                return
                
            formatted_paragraphs = []
            
            # 1. Tiêu đề (Đoạn 1): 📢 **Tiêu đề**
            raw_title = raw_paragraphs[0]
            clean_title = re.sub(r'^(📢\s*|\*\*|\*)*', '', raw_title)
            clean_title = re.sub(r'(\*\*|\*)*$', '', clean_title).strip()
            formatted_paragraphs.append(f'📢 **{clean_title}**')
            
            # 2. Xử lý từng đoạn văn (Giữ nguyên cấu trúc đoạn văn gốc, chỉ gán 1 icon chuẩn ở đầu đoạn)
            for p in raw_paragraphs[1:]:
                clean_p = p.strip()
                p_lower = clean_p.lower()
                
                # Nếu đã có icon ở đầu đoạn -> giữ nguyên
                if any(clean_p.startswith(icon) for icon in ['📢', '📌', '📍', '📋', '✅', '🔹', '🔸', '📅', '⏰', '🏛️', '👥', 'ℹ️', '⚠️', '☎️', '📧']):
                    formatted_paragraphs.append(clean_p)
                    continue
                    
                # Về phía cơ quan / địa phương -> 🏛️
                if p_lower.startswith('về phía') or p_lower.startswith('về mặt') or ('đảng ủy' in p_lower and 'về phía' in p_lower):
                    formatted_paragraphs.append(f'🏛️ {clean_p}')
                # Đoàn tham gia / Lãnh đạo sở ban ngành -> 👥
                elif any(p_lower.startswith(k) for k in ['tham gia', 'cùng đi', 'đoàn công tác', 'thành phần', 'đối tượng', 'đại biểu']) or 'tham gia đoàn' in p_lower:
                    formatted_paragraphs.append(f'👥 {clean_p}')
                # Thời gian / Mở đầu thời gian (Sáng ngày..., Ngày..., Thời gian...) -> 📅
                elif any(p_lower.startswith(k) for k in ['thời gian', 'sáng ngày', 'chiều ngày', 'tối ngày', 'ngày ', 'vào lúc', 'lúc ']):
                    formatted_paragraphs.append(f'📅 {clean_p}')
                # Địa điểm -> 📍
                elif any(p_lower.startswith(k) for k in ['địa điểm', 'tại hội trường', 'tại trụ sở', 'tại ']) or 'diễn ra tại' in p_lower:
                    formatted_paragraphs.append(f'📍 {clean_p}')
                # Lưu ý -> ⚠️
                elif any(p_lower.startswith(k) for k in ['lưu ý', 'chú ý', 'yêu cầu', 'quan trọng', 'đề nghị']):
                    formatted_paragraphs.append(f'⚠️ {clean_p}')
                # Liên hệ -> ☎️ / 📧
                elif any(k in p_lower for k in ['liên hệ:', 'điện thoại:', 'hotline:', 'sđt:', 'email:']):
                    formatted_paragraphs.append(f'☎️ {clean_p}' if 'email' not in p_lower else f'📧 {clean_p}')
                # Tiêu đề mục -> 📋 / 📌
                elif clean_p.endswith(':') or (len(clean_p) < 70 and clean_p.isupper()) or any(p_lower.startswith(k) for k in ['nội dung', 'mục đích', 'kế hoạch', 'kết quả']):
                    formatted_paragraphs.append(f'📋 {clean_p}' if 'nội dung' in p_lower or 'kế hoạch' in p_lower else f'📌 {clean_p}')
                # Danh sách vốn có của bài gốc -> 🔹
                elif clean_p.startswith(('-', '*', '+', '•', '–')) or re.match(r'^\d+[\.\)]', clean_p):
                    sub_cleaned = re.sub(r'^[\-\*\+\•\–\d\.\)]+\s*', '', clean_p)
                    formatted_paragraphs.append(f'🔹 {sub_cleaned}')
                else:
                    formatted_paragraphs.append(clean_p)
                    
            # 3. Dòng chèn liên kết
            formatted_paragraphs.append('🔗 Xem chi tiết tại:** _______________________________')
            
            # 4. Trích xuất Hashtag theo thứ tự từ lớn đến nhỏ (Tỉnh -> Huyện/Xã -> Sự kiện -> Cơ quan -> Lĩnh vực)
            full_text_lower = text.lower()
            hashtags = []
            
            # Tỉnh
            if 'sơn la' in full_text_lower: hashtags.append('#SơnLa')
            elif 'hà nội' in full_text_lower: hashtags.append('#HàNội')
            elif 'hồ chí minh' in full_text_lower or 'tphcm' in full_text_lower: hashtags.append('#TPHồChíMinh')
            
            # Huyện / Phường / Xã
            if 'chiềng cơi' in full_text_lower: hashtags.append('#ChiềngCơi')
            if 'chiềng mung' in full_text_lower: hashtags.append('#ChiềngMung')
            if 'tô hiệu' in full_text_lower: hashtags.append('#TôHiệu')
            if 'chiềng an' in full_text_lower: hashtags.append('#ChiềngAn')
            
            # Sự kiện / Nội dung / Lĩnh vực
            if 'chuyển đổi số' in full_text_lower: hashtags.append('#ChuyểnĐổiSố')
            if 'bình dân học vụ số' in full_text_lower: hashtags.append('#BìnhDânHọcVụSố')
            if 'cơ sở dữ liệu' in full_text_lower: hashtags.append('#CơSởDữLiệu')
            if 'hội nghị' in full_text_lower: hashtags.append('#HộiNghị')
            if 'đại hội' in full_text_lower: hashtags.append('#ĐạiHội')
            if 'sinh hoạt chính trị' in full_text_lower: hashtags.append('#SinhHoạtChínhTrị')
            if 'cải cách hành chính' in full_text_lower: hashtags.append('#CảiCáchHànhChính')
            
            # Cơ quan
            if 'ubnd' in full_text_lower or 'ủy ban' in full_text_lower or 'uỷ ban' in full_text_lower: hashtags.append('#UBND')
            if 'đảng' in full_text_lower or 'chi bộ' in full_text_lower: hashtags.append('#ĐảngBộ')
            if 'đoàn thanh niên' in full_text_lower: hashtags.append('#ĐoànThanhNiên')
            if 'hội phụ nữ' in full_text_lower: hashtags.append('#HộiPhụNữ')
            
            defaults = ['#TinTứcĐịaPhương', '#ThôngBáo', '#CơQuanNhàNước']
            for d in defaults:
                if len(hashtags) >= 5: break
                if d not in hashtags: hashtags.append(d)
                
            formatted_paragraphs.append(' '.join(hashtags[:8]))
            
            result = '\n\n'.join(formatted_paragraphs)
            
            self.txt_editor_output.delete("1.0", "end")
            self.txt_editor_output.insert("1.0", result)
            self.lbl_editor_status.configure(text="✨ Đã biên tập thành công!", text_color="#3AD9DC")
        except Exception as e:
            messagebox.showerror("Lỗi biên tập", f"Đã xảy ra lỗi: {str(e)}")

    def copy_prompt_ai(self):
        self.clipboard_clear()
        self.clipboard_append(SYSTEM_PROMPT_FANPAGE)
        self.update()
        self.lbl_editor_status.configure(text="📋 Đã copy Yêu cầu (Prompt AI) vào bộ nhớ tạm!", text_color="#3AD9DC")

    def copy_editor_output(self):
        text = self.txt_editor_output.get("1.0", "end").strip()
        if not text:
            messagebox.showwarning("Nhắc nhở", "Chưa có kết quả để sao chép!")
            return
        self.clipboard_clear()
        self.clipboard_append(text)
        self.update()
        self.lbl_editor_status.configure(text="✅ Đã sao chép bài viết vào bộ nhớ tạm!", text_color="#27C93F")

    def clear_editor_input(self):
        self.txt_editor_input.delete("1.0", "end")
        self.txt_editor_output.delete("1.0", "end")
        self.lbl_editor_status.configure(text="")

    def browse_folder(self):
        folder = filedialog.askdirectory(title="Chọn Thư mục chứa ảnh gốc")
        if folder:
            self.folder_path = folder
            valid_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
            self.image_files = [f for f in os.listdir(folder) if f.lower().endswith(valid_exts)]
            if self.image_files:
                self.lbl_folder_info.configure(text=f"Đã quét: {len(self.image_files)} ảnh", text_color="#3AD9DC")
            else:
                self.lbl_folder_info.configure(text="Thư mục không có ảnh hợp lệ!", text_color="#FF5F56")
                self.image_files = []

    def browse_archive(self):
        archive_file = filedialog.askopenfilename(
            title="Chọn File Nén (.ZIP, .RAR)",
            filetypes=[("Compressed Archives", "*.zip;*.rar;*.7z;*.tar;*.gz"), ("ZIP Files", "*.zip"), ("RAR Files", "*.rar"), ("All Files", "*.*")]
        )
        if archive_file:
            self.process_archive(archive_file)

    def process_archive(self, archive_path):
        """Tự động bung nén file ZIP, RAR, 7Z... và quét danh sách ảnh"""
        archive_name = os.path.basename(archive_path)
        self.lbl_folder_info.configure(text=f"Đang bung nén {archive_name}...", text_color="#3AD9DC")
        self.update()
        
        try:
            base_name = os.path.splitext(archive_name)[0]
            extract_dir = os.path.join(os.path.dirname(os.path.abspath(archive_path)), f"{base_name}_extracted")
            os.makedirs(extract_dir, exist_ok=True)
            
            ext = os.path.splitext(archive_path)[1].lower()
            success = False
            
            # 1. Thử giải nén .ZIP bằng thư viện zipfile của Python
            if ext == '.zip':
                try:
                    import zipfile
                    with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                        zip_ref.extractall(extract_dir)
                    success = True
                except Exception as e:
                    print("Zipfile error:", e)
            
            # 2. Thử giải nén bằng lệnh tar (có sẵn trên Windows 10/11 bsdtar)
            if not success:
                try:
                    res = subprocess.run(['tar', '-xf', archive_path, '-C', extract_dir], capture_output=True, text=True)
                    if res.returncode == 0:
                        success = True
                except Exception as e:
                    print("Tar command error:", e)
                    
            # 3. Thử thư viện rarfile nếu là .RAR
            if not success and ext == '.rar':
                try:
                    import rarfile
                    with rarfile.RarFile(archive_path, 'r') as rf:
                        rf.extractall(extract_dir)
                    success = True
                except Exception as e:
                    print("Rarfile error:", e)
                    
            if not success:
                messagebox.showerror("Lỗi giải nén", f"Không thể bung nén file '{archive_name}'. Vui lòng kiểm tra định dạng file nén!")
                self.lbl_folder_info.configure(text="Giải nén thất bại!", text_color="#FF5F56")
                return
                
            # Quét tìm toàn bộ ảnh hợp lệ trong thư mục sau giải nén (kể cả trong thư mục con)
            valid_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
            all_images = []
            
            for root, dirs, files in os.walk(extract_dir):
                for f in files:
                    if f.lower().endswith(valid_exts):
                        rel_path = os.path.relpath(os.path.join(root, f), extract_dir)
                        all_images.append(rel_path)
                        
            if all_images:
                self.folder_path = extract_dir
                self.image_files = all_images
                self.lbl_folder_info.configure(text=f"Đã bung nén: {len(all_images)} ảnh ({archive_name})", text_color="#3AD9DC")
            else:
                self.lbl_folder_info.configure(text="File nén không chứa hình ảnh hợp lệ!", text_color="#FF5F56")
                self.image_files = []
        except Exception as e:
            messagebox.showerror("Lỗi", f"Lỗi khi bung nén file:\n{str(e)}")
            self.lbl_folder_info.configure(text="Lỗi bung nén file!", text_color="#FF5F56")

    def browse_logo(self):
        logo_file = filedialog.askopenfilename(title="Chọn file Logo", filetypes=[("Image Files", "*.png;*.jpg;*.jpeg")])
        if logo_file:
            self.logo_path = logo_file
            self.use_default_logo = False
            self.lbl_logo_info.configure(text=f"Logo: {os.path.basename(logo_file)}", text_color="#F65C19")

    def apply_watermark(self, base_img_path, convert_rgb=True):
        """Xử lý thuật toán gắn logo thông minh"""
        base_img = Image.open(base_img_path).convert("RGBA")
        if self.use_default_logo or not self.logo_path:
            logo_img = self.create_default_logo().convert("RGBA")
        else:
            logo_img = Image.open(self.logo_path).convert("RGBA")
        
        base_w, base_h = base_img.size
        
        # 1. Tự động tương phản (Contrast = 1.25)
        enhancer = ImageEnhance.Contrast(logo_img)
        logo_img = enhancer.enhance(1.25)
        
        # 2. Tùy chỉnh Độ trong suốt (Opacity)
        opacity_ratio = 0.6
        if hasattr(self, 'slider_opacity'):
            opacity_ratio = float(self.slider_opacity.get()) / 100.0
            
        alpha = logo_img.split()[3]
        alpha = alpha.point(lambda p: int(p * opacity_ratio))
        logo_img.putalpha(alpha)
        
        # 3. Tự động Scale (20% chiều ngang ảnh gốc)
        target_logo_w = int(base_w * 0.20)
        target_logo_w = max(target_logo_w, 10) # Tránh lỗi chia 0
        scale_ratio = target_logo_w / float(logo_img.size[0])
        target_logo_h = int(float(logo_img.size[1]) * scale_ratio)
        
        # Resize mượt mà với bộ lọc LANCZOS
        logo_img = logo_img.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)
        
        # 4. Tạo Drop Shadow (Bóng đổ đen) chống chìm
        shadow = Image.new("RGBA", logo_img.size, (0, 0, 0, 0))
        shadow_mask = logo_img.split()[3].point(lambda p: p * 0.7)
        shadow.putalpha(shadow_mask)
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(3, int(target_logo_w * 0.02)))) # Độ nhòe động
        
        # 5. Tính toán vị trí Dropdown
        pos_str = self.position_var.get()
        edge_pad = max(5, int(base_w * 0.005))
        inner_pad = max(50, int(base_w * 0.04))
        pad = inner_pad if "Thụt vào" in pos_str else edge_pad
        
        x, y = 0, 0
        if "Center" in pos_str:
            x = (base_w - target_logo_w) // 2
            y = (base_h - target_logo_h) // 2
        elif "Trái" in pos_str and "Trên" in pos_str:
            x, y = pad, pad
        elif "Phải" in pos_str and "Trên" in pos_str:
            x, y = base_w - target_logo_w - pad, pad
        elif "Trái" in pos_str and "Dưới" in pos_str:
            x, y = pad, base_h - target_logo_h - pad
        elif "Phải" in pos_str and "Dưới" in pos_str:
            x, y = base_w - target_logo_w - pad, base_h - target_logo_h - pad
            
        # Tạo canvas trống cùng kích thước ảnh định dạng RGBA
        watermark_layer = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
        
        # Dán shadow lệch đi 1 chút (Offset)
        shadow_offset_x = max(2, int(target_logo_w * 0.015))
        shadow_offset_y = max(2, int(target_logo_w * 0.015))
        watermark_layer.paste(shadow, (x + shadow_offset_x, y + shadow_offset_y), shadow)
        
        # Dán logo chính thức lên
        watermark_layer.paste(logo_img, (x, y), logo_img)
        
        # Chồng layer vào ảnh gốc
        result = Image.alpha_composite(base_img, watermark_layer)
        
        if convert_rgb:
            return result.convert("RGB")
        return result

    def generate_preview(self):
        if not self.image_files:
            messagebox.showwarning("Nhắc nhở", "Vui lòng chọn Thư mục ảnh trước khi xem trước!")
            return
        if not self.logo_path and not self.use_default_logo:
            messagebox.showwarning("Nhắc nhở", "Vui lòng chọn file Logo trước khi xem trước!")
            return
            
        random_file = random.choice(self.image_files)
        img_full_path = os.path.join(self.folder_path, random_file)
        
        self.preview_canvas.configure(text="Đang xử lý hình ảnh...", image=None)
        self.update()
        
        try:
            preview_img = self.apply_watermark(img_full_path, convert_rgb=True)
            
            # Tính toán Resize để vừa kích thước khung Right Panel (Duy trì tỷ lệ ảnh)
            panel_w = max(400, self.canvas_frame.winfo_width() - 40)
            panel_h = max(400, self.canvas_frame.winfo_height() - 40)
            
            preview_img.thumbnail((panel_w, panel_h), Image.Resampling.LANCZOS)
            
            ctk_img = ctk.CTkImage(light_image=preview_img, dark_image=preview_img, size=preview_img.size)
            self.preview_canvas.configure(image=ctk_img, text="")
            self.preview_canvas.image = ctk_img # Tham chiếu tránh bị Garbage Collection
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể load Preview:\n{str(e)}")
            self.preview_canvas.configure(text="Lỗi hiển thị xem trước")

    def add_exif_metadata(self, image_path):
        """Nhúng thông tin bản quyền ẩn (EXIF) mang tên Lò Dương"""
        try:
            zeroth_ifd = {
                piexif.ImageIFD.Artist: "DuongLV".encode('utf-8'),
                piexif.ImageIFD.Copyright: "© 2026 DuongLV. All rights reserved.".encode('utf-8')
            }
            exif_dict = {"0th": zeroth_ifd}
            exif_bytes = piexif.dump(exif_dict)
            piexif.insert(exif_bytes, image_path)
        except Exception as e:
            pass # Bỏ qua nếu định dạng ảnh đó không hỗ trợ EXIF chuẩn

    def start_processing(self):
        if not self.image_files:
            messagebox.showwarning("Cảnh báo", "Vui lòng duyệt Thư mục ảnh để tiếp tục!")
            return
        if not self.logo_path and not self.use_default_logo:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn 1 file logo!")
            return
            
        # Khóa giao diện tránh click nhiều lần
        self.btn_start.configure(state="disabled", fg_color="gray", text="ĐANG XỬ LÝ...")
        self.btn_browse_folder.configure(state="disabled")
        if hasattr(self, 'btn_browse_archive'):
            self.btn_browse_archive.configure(state="disabled")
        self.btn_browse_logo.configure(state="disabled")
        self.btn_preview.configure(state="disabled")
        self.dropdown_pos.configure(state="disabled")
        
        # Bắt đầu đa luồng
        threading.Thread(target=self.process_images_thread, daemon=True).start()

    def process_images_thread(self):
        # 1. Tự động tạo thư mục con [daganlogo]
        output_dir = os.path.join(self.folder_path, "daganlogo")
        os.makedirs(output_dir, exist_ok=True)
        
        total = len(self.image_files)
        success = 0
        
        for i, file_name in enumerate(self.image_files):
            input_path = os.path.join(self.folder_path, file_name)
            output_path = os.path.join(output_dir, os.path.basename(file_name))  # Giữ nguyên tên gốc, ném vào daganlogo
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Cập nhật UI Progress
            # Sử dụng .after của tkinter để đảm bảo thread safe cập nhật UI
            self.after(0, self.update_progress, i + 1, total, file_name)
            
            try:
                final_img = self.apply_watermark(input_path, convert_rgb=True)
                final_img.save(output_path, "JPEG", quality=95)
                
                # Nhúng EXIF Metadata
                self.add_exif_metadata(output_path)
                success += 1
            except Exception as e:
                print(f"Lỗi ảnh {file_name}: {e}")
                
        self.after(0, self.finish_processing, success, total, output_dir)

    def update_progress(self, current, total, file_name):
        self.lbl_progress.configure(text=f"Đang xử lý: {current}/{total} ({file_name})")
        self.progressbar.set(current / total)

    def finish_processing(self, success, total, output_dir):
        self.lbl_progress.configure(text=f"Hoàn thành xuất sắc! Đã lưu {success}/{total} ảnh.")
        
        # Mở khóa giao diện
        self.btn_start.configure(state="normal", fg_color="#EE6721", text="Gắn logo")
        self.btn_browse_folder.configure(state="normal")
        if hasattr(self, 'btn_browse_archive'):
            self.btn_browse_archive.configure(state="normal")
        self.btn_browse_logo.configure(state="normal")
        self.btn_preview.configure(state="normal")
        self.dropdown_pos.configure(state="normal")
        
        # Tự động mở thư mục daganlogo
        if os.name == 'nt': # Windows
            os.startfile(output_dir)
        elif sys.platform == 'darwin': # macOS
            subprocess.Popen(['open', output_dir])
        else: # Linux
            subprocess.Popen(['xdg-open', output_dir])

    def create_default_logo(self):
        logo_file = resource_path("default_logo.png")
        if os.path.exists(logo_file):
            try:
                return Image.open(logo_file).convert("RGBA")
            except Exception as e:
                print(f"Lỗi đọc file logo mặc định: {e}")

        # Fallback tạo logo bằng code nếu không tìm thấy file default_logo.png
        img = Image.new("RGBA", (500, 500), (0, 0, 0, 0))
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        # Draw a stylized watermark badge
        draw.ellipse([50, 50, 450, 450], outline=(255, 255, 255, 120), width=8)
        draw.ellipse([70, 70, 430, 430], outline=(255, 255, 255, 60), width=4)
        
        try:
            font_title = ImageFont.truetype("arial.ttf", 46)
            font_sub = ImageFont.truetype("arial.ttf", 22)
        except IOError:
            font_title = ImageFont.load_default()
            font_sub = ImageFont.load_default()
            
        text1 = "CHIỀNG CƠI"
        w1 = draw.textlength(text1, font=font_title)
        draw.text((250 - w1/2, 195), text1, fill=(255, 255, 255, 200), font=font_title)
        
        draw.line([150, 260, 350, 260], fill=(255, 255, 255, 100), width=2)
        
        text2 = "TRUNG TÂM DVTH"
        w2 = draw.textlength(text2, font=font_sub)
        draw.text((250 - w2/2, 275), text2, fill=(255, 255, 255, 140), font=font_sub)
        
        return img

    def parse_dropped_paths(self, event_data):
        import re
        paths = []
        # Matches strings inside curly braces or non-space sequences
        pattern = re.compile(r'\{([^}]+)\}|(\S+)')
        for match in pattern.finditer(event_data):
            path = match.group(1) or match.group(2)
            if path:
                paths.append(os.path.abspath(path))
        return paths

    def handle_drop(self, event):
        paths = self.parse_dropped_paths(event.data)
        if not paths:
            return
            
        path = paths[0]
        
        if os.path.isdir(path):
            self.folder_path = path
            valid_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
            self.image_files = [f for f in os.listdir(path) if f.lower().endswith(valid_exts)]
            if self.image_files:
                self.lbl_folder_info.configure(text=f"Đã quét: {len(self.image_files)} ảnh", text_color="#3AD9DC")
            else:
                self.lbl_folder_info.configure(text="Thư mục không có ảnh hợp lệ!", text_color="#FF5F56")
                self.image_files = []
        elif os.path.isfile(path):
            ext = os.path.splitext(path)[1].lower()
            if ext in ('.zip', '.rar', '.7z', '.tar', '.gz'):
                self.process_archive(path)
            elif ext in ('.png', '.jpg', '.jpeg'):
                self.logo_path = path
                self.use_default_logo = False
                self.lbl_logo_info.configure(text=f"Logo: {os.path.basename(path)}", text_color="#F65C19")
            else:
                messagebox.showwarning("Cảnh báo", "Vui lòng kéo thả Thư mục, File nén (.zip/.rar) hoặc File logo (.png/.jpg)!")

if __name__ == "__main__":
    app = WatermarkApp()
    app.mainloop()
