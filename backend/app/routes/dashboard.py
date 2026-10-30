import datetime as dt
from typing import Literal

from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user
from ..models import Reminder, User
from ..recurrence import occurrences_between
from ..schemas import DashboardOut, Occurrence

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def date_range(view: str, anchor: dt.date) -> tuple[dt.date, dt.date]:
    """Return (first_day, last_day) inclusive. Weeks run Monday to Sunday."""
    if view == "day":
        return anchor, anchor
    if view == "week":
        start = anchor - dt.timedelta(days=anchor.weekday())
        return start, start + dt.timedelta(days=6)
    start = anchor.replace(day=1)
    next_month = (start + dt.timedelta(days=32)).replace(day=1)
    return start, next_month - dt.timedelta(days=1)


@router.get("", response_model=DashboardOut)
def get_dashboard(
    view: Literal["day", "week", "month"] = "day",
    on: dt.date | None = Query(default=None, description="Any date inside the period; defaults to today"),
    user: User = Depends(get_current_user),
):
    first, last = date_range(view, on or dt.date.today())
    range_start = dt.datetime.combine(first, dt.time.min)
    range_end = dt.datetime.combine(last + dt.timedelta(days=1), dt.time.min)

    reminders = Reminder.objects(user=user, start_at__lt=range_end)

    occurrences = [
        Occurrence(
            reminder_id=r.id,
            title=r.title,
            description=r.description,
            occurs_at=when,
            recurrence=r.recurrence,
            interval=r.interval,
        )
        for r in reminders
        for when in occurrences_between(r, range_start, range_end)
    ]
    occurrences.sort(key=lambda o: (o.occurs_at, o.title.lower()))
    return DashboardOut(view=view, range_start=first, range_end=last, occurrences=occurrences)
