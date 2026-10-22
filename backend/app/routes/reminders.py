from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Reminder, User
from ..schemas import ReminderIn, ReminderOut

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _get_owned(db: Session, user: User, reminder_id: int) -> Reminder:
    reminder = db.scalar(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user.id)
    )
    if reminder is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reminder not found")
    return reminder


@router.get("", response_model=list[ReminderOut])
def list_reminders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(
        select(Reminder).where(Reminder.user_id == user.id).order_by(Reminder.start_at)
    ).all()


@router.get("/{reminder_id}", response_model=ReminderOut)
def get_reminder(
    reminder_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return _get_owned(db, user, reminder_id)


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(
    data: ReminderIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    reminder = Reminder(user_id=user.id, **data.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.put("/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: int,
    data: ReminderIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    reminder = _get_owned(db, user, reminder_id)
    for field, value in data.model_dump().items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    db.delete(_get_owned(db, user, reminder_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
