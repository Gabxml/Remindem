import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Recurrence = Literal["none", "daily", "weekly", "monthly", "yearly"]


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    name: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ReminderIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    start_at: dt.datetime
    recurrence: Recurrence = "none"
    interval: int = Field(default=1, ge=1, le=365)
    end_date: dt.date | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title can't be empty")
        return v

    @field_validator("start_at")
    @classmethod
    def drop_timezone(cls, v: dt.datetime) -> dt.datetime:
        # Reminders are wall-clock times; ignore any tz offset the client sends.
        return v.replace(tzinfo=None, second=0, microsecond=0)

    @model_validator(mode="after")
    def check_recurrence(self):
        if self.recurrence == "none":
            self.end_date = None
            self.interval = 1
        elif self.end_date and self.end_date < self.start_at.date():
            raise ValueError("End date can't be before the start date")
        return self


class ReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    start_at: dt.datetime
    recurrence: Recurrence
    interval: int
    end_date: dt.date | None


class Occurrence(BaseModel):
    reminder_id: int
    title: str
    description: str
    occurs_at: dt.datetime
    recurrence: Recurrence
    interval: int


class DashboardOut(BaseModel):
    view: Literal["day", "week", "month"]
    range_start: dt.date  # first day shown (inclusive)
    range_end: dt.date  # last day shown (inclusive)
    occurrences: list[Occurrence]
