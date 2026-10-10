"""
FILE: main.py
Mục đích: File chạy chính của server Backend (FastAPI).
- Tự động tạo bảng trong Database khi khởi động.
- Cấu hình CORS để giao diện Web gọi được API.
- Định nghĩa các đường dẫn API: Đăng nhập/Đăng ký, Nhiệm vụ (Tasks), Danh mục (Categories).
- Tự động sinh ra giao diện tài liệu Swagger UI tại đường dẫn: http://127.0.0.1:8000/docs
"""

from typing import List, Optional
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import engine, get_db
import models
import schemas
import crud
import auth

# Tự động tạo các bảng (users, categories, tasks) trong SQLite nếu chưa tồn tại
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StudyFlow API — Backend Portfolio",
    description="Backend quản lý học tập, công việc, bảo mật xác thực người dùng bằng FastAPI và SQLAlchemy.",
    version="1.0.0",
)

# Cấu hình CORS để cho phép Frontend kết nối tới Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong thực tế có thể giới hạn URL web của bạn
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Trang chủ"])
def home():
    """Kiểm tra tình trạng server."""
    return {
        "message": "Chào mừng đến với StudyFlow Backend!",
        "docs": "Truy cập http://127.0.0.1:8000/docs để xem và thử nghiệm toàn bộ API.",
    }


# =========================================================================
# 1. AUTHENTICATION & USERS (Đăng ký, Đăng nhập, Bảo mật)
# =========================================================================
@app.post("/auth/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED, tags=["Xác thực & Người dùng"])
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Đăng ký tài khoản người dùng mới (Mật khẩu được mã hóa an toàn bằng bcrypt)."""
    existing_user = crud.get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký tài khoản.",
        )
    hashed_pwd = auth.get_password_hash(user_in.password)
    return crud.create_user(db, user_in, hashed_pwd)


import time
from collections import defaultdict
from fastapi import Request

# Bộ nhớ đệm chống tấn công Brute-force (Tối đa 5 lần thử sai trong vòng 60 giây)
LOGIN_FAILED_ATTEMPTS = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 60


@app.post("/auth/login", response_model=schemas.Token, tags=["Xác thực & Người dùng"])
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Đăng nhập bằng Email và Password.
    Có cơ chế CHỐNG BRUTE-FORCE: Khóa tạm thời 60 giây nếu thử sai quá 5 lần.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{form_data.username}"
    now = time.time()

    # Dọn dẹp các lần thử cũ hơn 60 giây
    recent_attempts = [t for t in LOGIN_FAILED_ATTEMPTS[rate_limit_key] if now - t < LOCKOUT_WINDOW_SECONDS]
    LOGIN_FAILED_ATTEMPTS[rate_limit_key] = recent_attempts

    # Kiểm tra nếu vượt quá số lần cho phép -> Chặn đứng bằng HTTP 429
    if len(recent_attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng đợi 60 giây trước khi thử lại.",
        )

    user = crud.get_user_by_email(db, form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        # Ghi nhận 1 lần thử sai
        LOGIN_FAILED_ATTEMPTS[rate_limit_key].append(now)
        remaining = MAX_LOGIN_ATTEMPTS - len(LOGIN_FAILED_ATTEMPTS[rate_limit_key])
        msg = "Email hoặc mật khẩu không chính xác."
        if remaining > 0:
            msg += f" Bạn còn {remaining} lần thử trước khi bị khóa tạm thời."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=msg,
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Đăng nhập thành công -> Xóa lịch sử thử sai của IP này
    LOGIN_FAILED_ATTEMPTS.pop(rate_limit_key, None)

    access_token = auth.create_access_token(data={"sub": user.id, "email": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@app.get("/auth/me", response_model=schemas.UserOut, tags=["Xác thực & Người dùng"])
def get_current_user_profile(
    current_user: models.User = Depends(auth.get_current_user),
):
    """Lấy thông tin tài khoản của người dùng đang đăng nhập."""
    return current_user


# =========================================================================
# 2. CATEGORIES (Danh mục môn học)
# =========================================================================
@app.get("/categories", response_model=List[schemas.CategoryOut], tags=["Danh mục môn học"])
def list_categories(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách các danh mục môn học của người dùng hiện tại."""
    return crud.get_user_categories(db, current_user.id)


@app.post("/categories", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED, tags=["Danh mục môn học"])
def create_category(
    cat_in: schemas.CategoryCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Tạo mới một danh mục môn học."""
    return crud.create_category(db, current_user.id, cat_in)


@app.delete("/categories/{category_id}", tags=["Danh mục môn học"])
def delete_category(
    category_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Xóa một danh mục."""
    success = crud.delete_category(db, current_user.id, category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục này.")
    return {"message": "Đã xóa danh mục thành công."}


# =========================================================================
# 3. TASKS (Quản lý bài tập & nhiệm vụ, hỗ trợ khung giờ chính xác)
# =========================================================================
@app.get("/tasks", response_model=List[schemas.TaskOut], tags=["Nhiệm vụ & Bài tập"])
def list_tasks(
    plan_date: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách bài tập của người dùng đang đăng nhập.
    Có thể lọc theo ngày: /tasks?plan_date=2026-10-10
    """
    return crud.get_user_tasks(db, current_user.id, plan_date)


@app.post("/tasks", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED, tags=["Nhiệm vụ & Bài tập"])
def create_task(
    task_in: schemas.TaskCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Tạo nhiệm vụ mới.
    Có thể đặt khung giờ chính xác (ví dụ start_time='01:15', end_time='03:25').
    """
    return crud.create_task(db, current_user.id, task_in)


@app.put("/tasks/{task_id}", response_model=schemas.TaskOut, tags=["Nhiệm vụ & Bài tập"])
def update_task(
    task_id: str,
    task_in: schemas.TaskUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Chỉnh sửa nhiệm vụ (sửa tiêu đề, cập nhật giờ làm, hoặc tích chọn hoàn thành)."""
    updated = crud.update_task(db, current_user.id, task_id, task_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập cần cập nhật.")
    return updated


@app.delete("/tasks/{task_id}", tags=["Nhiệm vụ & Bài tập"])
def delete_task(
    task_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Xóa một bài tập."""
    success = crud.delete_task(db, current_user.id, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập cần xóa.")
    return {"message": "Đã xóa bài tập thành công."}
