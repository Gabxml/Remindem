from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..deps import get_current_user
from ..models import Reminder, User
from ..schemas import ReminderIn, ReminderOut

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _get_owned(user: User, reminder_id: str) -> Reminder:
    reminder = None
    if ObjectId.is_valid(reminder_id):
        reminder = Reminder.objects(id=reminder_id, user=user).first()
    if reminder is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reminder not found")
    return reminder


@router.get("", response_model=list[ReminderOut])
def list_reminders(user: User = Depends(get_current_user)):
    return list(Reminder.objects(user=user).order_by("start_at"))


@router.get("/{reminder_id}", response_model=ReminderOut)
def get_reminder(reminder_id: str, user: User = Depends(get_current_user)):
    return _get_owned(user, reminder_id)


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(data: ReminderIn, user: User = Depends(get_current_user)):
    return Reminder(user=user, **data.model_dump()).save()


@router.put("/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: str,
    data: ReminderIn,
    user: User = Depends(get_current_user),
):
    reminder = _get_owned(user, reminder_id)
    for field, value in data.model_dump().items():
        setattr(reminder, field, value)
    reminder.save()
    return reminder


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: str, user: User = Depends(get_current_user)):
    _get_owned(user, reminder_id).delete()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
