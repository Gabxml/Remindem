import datetime as dt

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..deps import get_current_user
from ..models import Reminder, User
from ..recurrence import occurrences_between
from ..schemas import CompletionIn, ReminderIn, ReminderOut

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


@router.post("/{reminder_id}/completion", status_code=status.HTTP_204_NO_CONTENT)
def set_completion(
    reminder_id: str,
    data: CompletionIn,
    user: User = Depends(get_current_user),
):
    """Mark (or unmark) one occurrence of a reminder as done."""
    reminder = _get_owned(user, reminder_id)
    when = data.occurs_at

    # Only accept times this reminder actually fires at.
    if not occurrences_between(reminder, when, when + dt.timedelta(seconds=1)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not an occurrence of this reminder")

    completed = {value.replace(second=0, microsecond=0) for value in reminder.completed_at}
    if data.done:
        completed.add(when)
    else:
        completed.discard(when)
    reminder.completed_at = sorted(completed)
    reminder.save()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
