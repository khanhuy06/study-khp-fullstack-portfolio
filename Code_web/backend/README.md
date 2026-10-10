# Hướng dẫn chạy Backend StudyFlow (Python + FastAPI)

Thư mục này chứa toàn bộ hệ thống **Backend độc lập** được viết bằng **Python** chuẩn chỉnh theo mô hình API RESTful hiện đại.

---

## 1. Cấu trúc thư mục Backend

| Tên file | Ý nghĩa & Chức năng |
| :--- | :--- |
| **`database.py`** | Kết nối cơ sở dữ liệu SQLite (`studyflow.db`) và quản lý session phiên làm việc. |
| **`models.py`** | Định nghĩa các bảng `User`, `Category`, `Task` (khóa chính, khóa ngoại, quan hệ 1-Nhiều). |
| **`schemas.py`** | Khuôn mẫu Pydantic kiểm tra tính hợp lệ của dữ liệu đầu vào và đầu ra của API. |
| **`auth.py`** | Bảo mật: Mã hóa mật khẩu một chiều bằng `bcrypt`, tạo và xác thực `JWT Token`. |
| **`crud.py`** | Các hàm thao tác với Database (Thêm, Đọc, Cập nhật, Xóa) có kiểm tra quyền sở hữu của user. |
| **`main.py`** | Server chính của FastAPI, kết nối CORS và tạo các API endpoints. |
| **`requirements.txt`** | Danh sách các thư viện Python cần cài đặt. |

---

## 2. Cách chạy Backend trên máy tính (Localhost)

Mở Terminal (hoặc PowerShell) tại thư mục `backend/` và chạy 2 bước sau:

### Bước 1: Cài đặt các thư viện cần thiết
```bash
pip install -r requirements.txt
```

### Bước 2: Khởi động server FastAPI
```bash
uvicorn main:app --reload
```

---

## 3. Xem và thử nghiệm API (Swagger UI)

Khi server đang chạy, mở trình duyệt bất kỳ và truy cập vào đường dẫn:
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

Tại đây bạn sẽ có:
1. Giao diện trực quan cho phép **thử Đăng ký, Đăng nhập, Thêm bài tập, Đặt giờ** ngay trên web mà không cần viết code frontend.
2. Nút **Authorize** màu xanh góc trên để dán Token đăng nhập và kiểm tra các API bảo mật.
