import datetime as dt

from mongoengine import (
    CASCADE,
    DateField,
    DateTimeField,
    Document,
    IntField,
    ReferenceField,
    StringField,
)


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)


class User(Document):
    email = StringField(required=True, unique=True, max_length=255)
    name = StringField(required=True, max_length=100)
    password_hash = StringField(required=True, max_length=255)
    created_at = DateTimeField(default=_now)

    meta = {"collection": "users"}


class Reminder(Document):
    """
    start_at is a naive "wall-clock" datetime (9:00 means 9:00 for the user,
    wherever they are). Recurrence repeats from start_at every `interval` units.
    """

    user = ReferenceField(User, required=True, reverse_delete_rule=CASCADE)
    title = StringField(required=True, max_length=200)
    description = StringField(default="", max_length=2000)
    start_at = DateTimeField(required=True)
    recurrence = StringField(
        default="none", choices=("none", "daily", "weekly", "monthly", "yearly")
    )
    interval = IntField(default=1, min_value=1, max_value=365)
    end_date = DateField(null=True)
    created_at = DateTimeField(default=_now)

    meta = {"collection": "reminders", "indexes": ["start_at", "user"]}
