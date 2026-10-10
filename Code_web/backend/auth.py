"""
FILE: auth.py
Mục đích: Xử lý toàn bộ logic BẢO MẬT & XÁC THỰC (Security & Authentication):
1. Mã hóa mật khẩu một chiều bằng thuật toán an toàn bcrypt (không thể dịch ngược).
2. Tạo mã vé thông hành (JWT Access Token) khi người dùng đăng nhập thành công.
3. Kiểm tra tính hợp lệ của token và lấy thông tin người dùng hiện tại (get_current_user).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import os
from database import get_db
import models

# KHÓA BÍ MẬT để ký token (Đọc từ biến môi trường .env, không bao giờ lộ trên GitHub)
SECRET_KEY = os.getenv("SECRET_KEY", "c3R1ZHlmbG93X3N1cGVyX3NlY3JldF9qd3Rfa2V5X3BvcnRmb2xpb18yMDI2")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

# Công cụ mã hóa mật khẩu dùng thuật toán bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Khai báo đường dẫn lấy token cho Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra xem mật khẩu người dùng nhập có khớp với mật khẩu đã mã hóa không."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Mã hóa mật khẩu bằng bcrypt trước khi lưu vào Database."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Tạo vé thông hành JWT chứa thông tin người dùng (id, email)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """
    Dependency bảo vệ các đường dẫn API:
    - Bắt buộc client phải gửi kèm Token (Bearer token).
    - Giải mã token và tìm kiếm User tương ứng trong database.
    - Nếu token sai hoặc hết hạn -> Trả về lỗi 401 Unauthorized ngay lập tức.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
