"""
FILE: schemas.py
Mục đích: Định nghĩa các khuôn mẫu dữ liệu (Pydantic models) cho API.
- Dữ liệu client gửi lên (Request) phải đúng định dạng này mới được chấp nhận.
- Dữ liệu API trả về (Response) sẽ tự động lọc bỏ các trường nhạy cảm (như mật khẩu).
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ===================== USER SCHEMAS =====================
class UserCreate(BaseModel):
    """Schema khi người dùng đăng ký tài khoản mới."""
    email: EmailStr
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    display_name: Optional[str] = "Học sinh"


class UserLogin(BaseModel):
    """Schema khi người dùng gửi form đăng nhập."""
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Schema trả về thông tin người dùng (không trả về mật khẩu)."""
    id: str
    email: EmailStr
    display_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema trả về Token đăng nhập (JWT)."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ===================== CATEGORY SCHEMAS =====================
class CategoryCreate(BaseModel):
    """Schema tạo mới một danh mục (ví dụ: Toán, Coding...)."""
    name: str
    color: Optional[str] = "cyan"


class CategoryOut(BaseModel):
    id: str
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== TASK SCHEMAS =====================
class TaskCreate(BaseModel):
    """Schema khi tạo mới một nhiệm vụ / bài tập."""
    title: str
    category_id: Optional[str] = None
    priority: Optional[str] = "medium"  # 'high', 'medium', 'low'
    plan_date: str                       # 'YYYY-MM-DD'
    start_time: Optional[str] = None     # '01:15'
    end_time: Optional[str] = None       # '03:25'
    deadline: Optional[datetime] = None


class TaskUpdate(BaseModel):
    """Schema khi chỉnh sửa thông tin hoặc cập nhật trạng thái nhiệm vụ."""
    title: Optional[str] = None
    category_id: Optional[str] = None
    priority: Optional[str] = None
    plan_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    deadline: Optional[datetime] = None
    completed: Optional[bool] = None


class TaskOut(BaseModel):
    """Schema trả về dữ liệu nhiệm vụ cho client."""
    id: str
    user_id: str
    category_id: Optional[str]
    title: str
    priority: str
    plan_date: str
    start_time: Optional[str]
    end_time: Optional[str]
    deadline: Optional[datetime]
    completed: bool
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
