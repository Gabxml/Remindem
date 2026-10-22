"""Expand a reminder into the concrete times it fires within a date range."""
import datetime as dt

from dateutil.rrule import DAILY, MONTHLY, WEEKLY, YEARLY, rrule

_FREQ = {"daily": DAILY, "weekly": WEEKLY, "monthly": MONTHLY, "yearly": YEARLY}


def occurrences_between(reminder, range_start: dt.datetime, range_end: dt.datetime) -> list[dt.datetime]:
    """Times the reminder fires in [range_start, range_end)."""
    start = reminder.start_at

    if reminder.recurrence == "none":
        return [start] if range_start <= start < range_end else []

    last = range_end - dt.timedelta(microseconds=1)
    if reminder.end_date:
        last = min(last, dt.datetime.combine(reminder.end_date, dt.time.max))
    if start > last:
        return []

    rule = rrule(
        _FREQ[reminder.recurrence],
        interval=reminder.interval,
        dtstart=start,
        until=last,
    )
    # Note: a monthly reminder starting on the 31st skips months without a 31st.
    return list(rule.between(range_start, last, inc=True))
