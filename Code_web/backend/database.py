"""
FILE: database.py
Mục đích: Thiết lập kết nối cơ sở dữ liệu (Database Engine & Session).
Ở đây sử dụng SQLite (cực kỳ nhẹ, tạo file studyflow.db ngay trong máy, không cần cài đặt phần mềm phụ).
Khi muốn chuyển sang PostgreSQL, chỉ cần thay đổi đường dẫn DATABASE_URL.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Đường dẫn file database (Đọc từ .env, mặc định là SQLite studyflow.db)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./studyflow.db")

# Khởi tạo engine kết nối
# check_same_thread=False chỉ bắt buộc đối với SQLite khi chạy trên FastAPI
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Tạo một SessionFactory để tạo phiên làm việc mỗi khi có yêu cầu (request) gửi tới API
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Lớp cơ sở (Base) để tất cả các bảng trong models.py kế thừa
Base = declarative_base()


def get_db():
    """
    Dependency (phụ thuộc) trong FastAPI:
    Tự động mở phiên làm việc với database khi client gửi yêu cầu,
    và tự động đóng phiên (db.close()) khi xử lý xong để giải phóng bộ nhớ.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
