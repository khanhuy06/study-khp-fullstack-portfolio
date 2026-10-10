# StudyFlow — Nền tảng quản lý học tập & năng suất cá nhân (Fullstack Portfolio)

Dự án Fullstack hoàn chỉnh gồm 2 phần tách biệt: **Backend** (Python FastAPI) và **Frontend** (React TypeScript).

---

## 📁 Cấu trúc dự án

```text
StudyFlow/
├── backend/    # Server API xử lý dữ liệu và bảo mật (Python FastAPI, SQLite, SQLAlchemy, JWT)
├── frontend/   # Giao diện người dùng (React 19, Tailwind CSS, Lucide icons, Pomodoro timer)
└── README.md   # Tài liệu tổng quan
```

---

## 🚀 Hướng dẫn khởi chạy

### 1. Khởi động Backend (Python)
Mở cửa sổ Terminal thứ nhất:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
* **Swagger UI tài liệu API:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Khởi động Frontend (Web)
Mở cửa sổ Terminal thứ hai:
```bash
cd frontend
npm install
npm run dev
```
* **Giao diện web:** Mở trình duyệt tại địa chỉ hiển thị trong terminal (thường là `http://localhost:5173` hoặc `http://localhost:3000`).

---

## 🛠️ Tính năng chính
1. **Bảo mật & Xác thực:** Đăng ký, đăng nhập cấp mã JWT, mã hóa mật khẩu bằng `bcrypt`.
2. **Quản lý nhiệm vụ & Khung giờ:** Hỗ trợ đặt giờ chính xác (ví dụ `01:15 - 03:25`) và hiển thị timeline thời gian thực.
3. **Bộ đếm Pomodoro:** 25 phút tập trung / 5 phút nghỉ giải lao.
4. **Theo dõi Streak:** Tự động tính chuỗi ngày học tập liên tục.
