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
    if view == "year":
        start = anchor.replace(month=1, day=1)
        return start, start.replace(month=12, day=31)
    start = anchor.replace(day=1)
    next_month = (start + dt.timedelta(days=32)).replace(day=1)
    return start, next_month - dt.timedelta(days=1)


@router.get("", response_model=DashboardOut)
def get_dashboard(
    view: Literal["day", "week", "month", "year"] = "day",
    on: dt.date | None = Query(default=None, description="Any date inside the period; defaults to today"),
    recurrence: list[Literal["none", "daily", "weekly", "monthly", "yearly"]] | None = Query(
        default=None, description="Only include reminders with these recurrences"
    ),
    user: User = Depends(get_current_user),
):
    first, last = date_range(view, on or dt.date.today())
    range_start = dt.datetime.combine(first, dt.time.min)
    range_end = dt.datetime.combine(last + dt.timedelta(days=1), dt.time.min)

    filters = {"user": user, "start_at__lt": range_end}
    if recurrence:
        filters["recurrence__in"] = recurrence
    reminders = Reminder.objects(**filters)

    occurrences = []
    for r in reminders:
        completed = {value.replace(second=0, microsecond=0) for value in r.completed_at}
        for when in occurrences_between(r, range_start, range_end):
            occurrences.append(
                Occurrence(
                    reminder_id=r.id,
                    title=r.title,
                    description=r.description,
                    occurs_at=when,
                    recurrence=r.recurrence,
                    interval=r.interval,
                    done=when.replace(second=0, microsecond=0) in completed,
                )
            )
    occurrences.sort(key=lambda o: (o.occurs_at, o.title.lower()))
    return DashboardOut(view=view, range_start=first, range_end=last, occurrences=occurrences)
