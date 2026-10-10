"""
FILE: models.py
Mục đích: Định nghĩa các BẢNG trong cơ sở dữ liệu bằng cú pháp ORM (SQLAlchemy).
Tương đương với các câu lệnh CREATE TABLE trong SQL.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


def generate_uuid() -> str:
    """Tạo chuỗi định danh duy nhất (UUID) cho mỗi dòng dữ liệu."""
    return str(uuid.uuid4())


class User(Base):
    """
    Bảng người dùng (users).
    Lưu thông tin đăng ký, mật khẩu đã mã hóa (không bao giờ lưu mật khẩu gốc).
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)  # Mật khẩu đã được mã hóa bcrypt
    display_name = Column(String(100), default="Học sinh / Sinh viên")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Mối quan hệ 1-Nhiều: Một user sở hữu nhiều danh mục và nhiều bài tập
    categories = relationship("Category", back_populates="owner", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")


class Category(Base):
    """
    Bảng danh mục môn học / loại công việc (categories).
    Ví dụ: University, Coding, Personal, Toán, Lý...
    """
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(30), default="cyan")  # cyan, violet, green, amber, rose, slate
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="categories")
    tasks = relationship("Task", back_populates="category")


class Task(Base):
    """
    Bảng bài tập / nhiệm vụ (tasks).
    Hỗ trợ ngày làm việc, khung giờ chính xác (start_time, end_time), mức độ ưu tiên và trạng thái.
    """
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    title = Column(Text, nullable=False)  # Tiêu đề bài tập
    priority = Column(String(20), default="medium")  # high, medium, low

    plan_date = Column(String(10), nullable=False)  # Định dạng 'YYYY-MM-DD', ví dụ: '2026-10-10'
    start_time = Column(String(5), nullable=True)   # Giờ bắt đầu, ví dụ: '01:15'
    end_time = Column(String(5), nullable=True)     # Giờ kết thúc, ví dụ: '03:25'

    deadline = Column(DateTime, nullable=True)      # Hạn chót nộp bài
    completed = Column(Boolean, default=False)      # Đã xong chưa?
    completed_at = Column(DateTime, nullable=True)  # Lúc hoàn thành (dùng tính chuỗi streak)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="tasks")
    category = relationship("Category", back_populates="tasks")
