"""
FILE: crud.py
Mục đích: Chứa toàn bộ các hàm thao tác TRUY VẤN DỮ LIỆU (CRUD: Create, Read, Update, Delete) với Database.
Nguyên tắc quan trọng: Mọi truy vấn đều lọc theo user_id để đảm bảo người dùng chỉ xem và sửa bài tập của chính mình.
"""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

import models
import schemas


# ===================== USER CRUD =====================
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Tìm người dùng theo email."""
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user_in: schemas.UserCreate, hashed_password: str) -> models.User:
    """Tạo người dùng mới và tự động tạo 3 danh mục mặc định ban đầu."""
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        display_name=user_in.display_name or "Học sinh",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Khởi tạo sẵn 3 danh mục học tập cơ bản
    default_categories = [
        models.Category(user_id=new_user.id, name="University", color="violet"),
        models.Category(user_id=new_user.id, name="Coding", color="green"),
        models.Category(user_id=new_user.id, name="Personal", color="slate"),
    ]
    db.add_all(default_categories)
    db.commit()

    return new_user


# ===================== CATEGORY CRUD =====================
def get_user_categories(db: Session, user_id: str) -> List[models.Category]:
    """Lấy danh sách các danh mục môn học của một user cụ thể."""
    return db.query(models.Category).filter(models.Category.user_id == user_id).all()


def create_category(db: Session, user_id: str, cat_in: schemas.CategoryCreate) -> models.Category:
    """Tạo mới một danh mục môn học."""
    new_cat = models.Category(
        user_id=user_id,
        name=cat_in.name,
        color=cat_in.color or "cyan",
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat


def delete_category(db: Session, user_id: str, category_id: str) -> bool:
    """Xóa một danh mục của người dùng."""
    cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.user_id == user_id,
    ).first()
    if not cat:
        return False
    db.delete(cat)
    db.commit()
    return True


# ===================== TASK CRUD =====================
def get_user_tasks(
    db: Session, user_id: str, plan_date: Optional[str] = None
) -> List[models.Task]:
    """
    Lấy danh sách bài tập của người dùng.
    Có thể lọc theo ngày cụ thể (ví dụ hôm nay).
    """
    query = db.query(models.Task).filter(models.Task.user_id == user_id)
    if plan_date:
        query = query.filter(models.Task.plan_date == plan_date)
    return query.order_by(models.Task.created_at.asc()).all()


def create_task(db: Session, user_id: str, task_in: schemas.TaskCreate) -> models.Task:
    """Tạo một bài tập / nhiệm vụ mới với khung giờ cụ thể."""
    new_task = models.Task(
        user_id=user_id,
        category_id=task_in.category_id,
        title=task_in.title,
        priority=task_in.priority or "medium",
        plan_date=task_in.plan_date,
        start_time=task_in.start_time,
        end_time=task_in.end_time,
        deadline=task_in.deadline,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


def update_task(
    db: Session, user_id: str, task_id: str, task_in: schemas.TaskUpdate
) -> Optional[models.Task]:
    """Cập nhật thông tin bài tập (tiêu đề, khung giờ, hoặc đánh dấu hoàn thành)."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == user_id,
    ).first()
    if not task:
        return None

    update_data = task_in.model_dump(exclude_unset=True)

    # Nếu người dùng đổi trạng thái completed
    if "completed" in update_data:
        if update_data["completed"] and not task.completed:
            task.completed_at = datetime.now(timezone.utc)
        elif not update_data["completed"]:
            task.completed_at = None

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, user_id: str, task_id: str) -> bool:
    """Xóa một bài tập."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == user_id,
    ).first()
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True
