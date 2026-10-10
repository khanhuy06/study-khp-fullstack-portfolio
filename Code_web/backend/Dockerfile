# 1. Chọn hệ điều hành nền tảng nhẹ (Python 3.13 bản rút gọn Alpine/Slim)
FROM python:3.13-slim

# 2. Đặt thư mục làm việc bên trong container
WORKDIR /app

# 3. Thiết lập biến môi trường để Python không ghi file cache rác
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 4. Sao chép danh sách thư viện và cài đặt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Sao chép toàn bộ mã nguồn backend vào container
COPY . .

# 6. Mở cổng 8000 của container
EXPOSE 8000

# 7. Lệnh khởi động server FastAPI khi container bật lên
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
