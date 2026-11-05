from conftest import make_user


def add(client, auth, title, start, **kw):
    r = client.post("/api/reminders", json={"title": title, "start_at": start, **kw}, headers=auth)
    assert r.status_code == 201, r.text
    return r.json()


def dash(client, auth, view, on, **params):
    r = client.get("/api/dashboard", params={"view": view, "on": on, **params}, headers=auth)
    assert r.status_code == 200, r.text
    return r.json()


def titles_and_days(data):
    return [(o["title"], o["occurs_at"][:10]) for o in data["occurrences"]]


# ---- auth ----

def test_register_login_me(client):
    make_user(client)
    r = client.post("/api/auth/login", json={"email": "A@Example.com", "password": "password123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == "a@example.com"


def test_duplicate_email_and_bad_password(client):
    make_user(client)
    dup = client.post("/api/auth/register", json={"email": "a@example.com", "name": "X", "password": "password123"})
    assert dup.status_code == 409
    bad = client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-password"})
    assert bad.status_code == 401


def test_dashboard_requires_login(client):
    assert client.get("/api/dashboard").status_code == 401
    assert client.get("/api/dashboard", headers={"Authorization": "Bearer junk"}).status_code == 401


# ---- one-time reminders ----

def test_one_time_reminder_only_in_its_period(client, auth):
    add(client, auth, "Dentist", "2026-10-21T09:00")
    assert titles_and_days(dash(client, auth, "day", "2026-10-21")) == [("Dentist", "2026-10-21")]
    assert dash(client, auth, "day", "2026-10-22")["occurrences"] == []
    assert len(dash(client, auth, "week", "2026-10-25")["occurrences"]) == 1  # Sunday of same week
    assert dash(client, auth, "week", "2026-10-26")["occurrences"] == []      # next Monday
    assert len(dash(client, auth, "month", "2026-10-01")["occurrences"]) == 1
    assert dash(client, auth, "month", "2026-11-01")["occurrences"] == []


def test_week_runs_monday_to_sunday_and_month_bounds(client, auth):
    d = dash(client, auth, "week", "2026-10-21")  # a Wednesday
    assert (d["range_start"], d["range_end"]) == ("2026-10-19", "2026-10-25")
    d = dash(client, auth, "month", "2026-02-10")
    assert (d["range_start"], d["range_end"]) == ("2026-02-01", "2026-02-28")
    d = dash(client, auth, "month", "2026-12-31")
    assert (d["range_start"], d["range_end"]) == ("2026-12-01", "2026-12-31")


def test_midnight_edges(client, auth):
    add(client, auth, "Late", "2026-10-21T23:59")
    add(client, auth, "Early", "2026-10-22T00:00")
    assert titles_and_days(dash(client, auth, "day", "2026-10-21")) == [("Late", "2026-10-21")]
    assert titles_and_days(dash(client, auth, "day", "2026-10-22")) == [("Early", "2026-10-22")]


# ---- recurring reminders ----

def test_daily_recurrence(client, auth):
    add(client, auth, "Vitamins", "2026-10-01T08:00", recurrence="daily")
    assert len(dash(client, auth, "day", "2026-10-21")["occurrences"]) == 1
    assert len(dash(client, auth, "week", "2026-10-21")["occurrences"]) == 7
    assert len(dash(client, auth, "month", "2026-10-21")["occurrences"]) == 31
    # month before the start date: nothing
    assert dash(client, auth, "month", "2026-09-15")["occurrences"] == []
    # month the series starts in: only from the start date onward
    assert len(dash(client, auth, "month", "2026-10-01")["occurrences"]) == 31


def test_every_n_days(client, auth):
    add(client, auth, "Water plants", "2026-10-01T08:00", recurrence="daily", interval=3)
    days = [o["occurs_at"][8:10] for o in dash(client, auth, "month", "2026-10-15")["occurrences"]]
    assert days == ["01", "04", "07", "10", "13", "16", "19", "22", "25", "28", "31"]


def test_weekly_recurrence_keeps_weekday(client, auth):
    add(client, auth, "Team sync", "2026-10-07T10:00", recurrence="weekly")  # a Wednesday
    got = titles_and_days(dash(client, auth, "month", "2026-10-21"))
    assert [d for _, d in got] == ["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"]
    assert titles_and_days(dash(client, auth, "week", "2026-10-21")) == [("Team sync", "2026-10-21")]
    assert dash(client, auth, "day", "2026-10-22")["occurrences"] == []


def test_monthly_and_yearly(client, auth):
    add(client, auth, "Rent", "2026-01-05T09:00", recurrence="monthly")
    add(client, auth, "Mom's birthday", "2020-10-21T00:00", recurrence="yearly")
    assert titles_and_days(dash(client, auth, "month", "2026-10-01")) == [
        ("Rent", "2026-10-05"), ("Mom's birthday", "2026-10-21")]
    assert titles_and_days(dash(client, auth, "day", "2027-10-21")) == [("Mom's birthday", "2027-10-21")]


def test_end_date_is_inclusive(client, auth):
    add(client, auth, "Course", "2026-10-01T18:00", recurrence="daily", end_date="2026-10-05")
    days = [o["occurs_at"][8:10] for o in dash(client, auth, "month", "2026-10-01")["occurrences"]]
    assert days == ["01", "02", "03", "04", "05"]
    assert dash(client, auth, "day", "2026-10-06")["occurrences"] == []


def test_sorted_by_time(client, auth):
    add(client, auth, "B", "2026-10-21T15:00")
    add(client, auth, "A", "2026-10-21T08:30")
    add(client, auth, "Daily", "2026-10-01T12:00", recurrence="daily")
    assert [o["title"] for o in dash(client, auth, "day", "2026-10-21")["occurrences"]] == ["A", "Daily", "B"]


# ---- separate recurring views from the calendar ----

def test_recurrence_filter_isolates_each_view(client, auth):
    add(client, auth, "One-off", "2026-10-21T09:00")
    add(client, auth, "Daily", "2026-10-01T08:00", recurrence="daily")
    add(client, auth, "Weekly", "2026-10-07T10:00", recurrence="weekly")
    add(client, auth, "Monthly", "2026-10-05T11:00", recurrence="monthly")
    add(client, auth, "Yearly", "2020-10-21T12:00", recurrence="yearly")

    assert [o["title"] for o in dash(client, auth, "day", "2026-10-21", recurrence="daily")["occurrences"]] == ["Daily"]
    assert [o["title"] for o in dash(client, auth, "week", "2026-10-21", recurrence="weekly")["occurrences"]] == ["Weekly"]
    assert [o["title"] for o in dash(client, auth, "month", "2026-10-21", recurrence="monthly")["occurrences"]] == ["Monthly"]
    assert [o["title"] for o in dash(client, auth, "year", "2026-10-21", recurrence="yearly")["occurrences"]] == ["Yearly"]


def test_daily_view_shows_everything_due_today(client, auth):
    # 2026-10-19 is a Monday.
    add(client, auth, "One-off", "2026-10-19T12:00")
    add(client, auth, "Daily", "2026-10-01T08:00", recurrence="daily")
    add(client, auth, "Weekly", "2026-10-05T09:00", recurrence="weekly")
    add(client, auth, "Monthly", "2026-09-19T10:00", recurrence="monthly")
    add(client, auth, "Yearly", "2020-10-19T11:00", recurrence="yearly")

    daily = dash(client, auth, "day", "2026-10-19")
    assert [o["title"] for o in daily["occurrences"]] == ["Daily", "Weekly", "Monthly", "Yearly", "One-off"]

    # The cadence-specific views stay isolated.
    assert [o["title"] for o in dash(client, auth, "week", "2026-10-19", recurrence="weekly")["occurrences"]] == ["Weekly"]
    assert [o["title"] for o in dash(client, auth, "month", "2026-10-19", recurrence="monthly")["occurrences"]] == ["Monthly"]


def test_calendar_shows_one_time_and_yearly_reminders(client, auth):
    add(client, auth, "One-off", "2026-10-21T09:00")
    add(client, auth, "Daily", "2026-10-01T08:00", recurrence="daily")
    add(client, auth, "Weekly", "2026-10-07T10:00", recurrence="weekly")
    add(client, auth, "Monthly", "2026-10-05T11:00", recurrence="monthly")
    add(client, auth, "Yearly", "2020-10-21T12:00", recurrence="yearly")

    calendar = dash(client, auth, "month", "2026-10-01", recurrence=["none", "yearly"])
    assert titles_and_days(calendar) == [
        ("One-off", "2026-10-21"),
        ("Yearly", "2026-10-21"),
    ]


def test_year_range(client, auth):
    d = dash(client, auth, "year", "2026-10-21")
    assert (d["range_start"], d["range_end"]) == ("2026-01-01", "2026-12-31")


# ---- CRUD & isolation ----

def test_update_and_delete(client, auth):
    r = add(client, auth, "Old", "2026-10-21T09:00")
    upd = client.put(f"/api/reminders/{r['id']}", headers=auth,
                     json={"title": "New", "start_at": "2026-10-22T10:00", "recurrence": "weekly"})
    assert upd.status_code == 200
    assert titles_and_days(dash(client, auth, "day", "2026-10-22")) == [("New", "2026-10-22")]
    assert client.delete(f"/api/reminders/{r['id']}", headers=auth).status_code == 204
    assert dash(client, auth, "month", "2026-10-01")["occurrences"] == []


# ---- per-occurrence completion ----

def mark(client, auth, reminder_id, occurs_at, done=True):
    return client.post(f"/api/reminders/{reminder_id}/completion", headers=auth,
                       json={"occurs_at": occurs_at, "done": done})


def test_completion_marks_only_one_occurrence(client, auth):
    r = add(client, auth, "Daily", "2026-10-01T08:00", recurrence="daily")

    assert mark(client, auth, r["id"], "2026-10-21T08:00").status_code == 204
    done = {o["occurs_at"][:10]: o["done"]
            for o in dash(client, auth, "week", "2026-10-21")["occurrences"]}
    assert done["2026-10-20"] is False
    assert done["2026-10-21"] is True
    assert done["2026-10-22"] is False

    # Unmarking restores it without touching the others.
    assert mark(client, auth, r["id"], "2026-10-21T08:00", done=False).status_code == 204
    assert not any(o["done"] for o in dash(client, auth, "week", "2026-10-21")["occurrences"])


def test_completion_rejects_non_occurrences(client, auth):
    r = add(client, auth, "Daily", "2026-10-01T08:00", recurrence="daily")
    assert mark(client, auth, r["id"], "2026-10-21T09:00").status_code == 400
    assert mark(client, auth, r["id"], "2026-10-21T08:00").status_code == 204

    one_off = add(client, auth, "Once", "2026-10-21T09:00")
    assert mark(client, auth, one_off["id"], "2026-10-22T09:00").status_code == 400


def test_completion_requires_ownership(client, auth):
    other = make_user(client, "b@example.com", "Ben")
    r = add(client, auth, "Private", "2026-10-21T09:00")
    assert mark(client, other, r["id"], "2026-10-21T09:00").status_code == 404


def test_users_only_see_their_own(client, auth):
    other = make_user(client, "b@example.com", "Ben")
    r = add(client, auth, "Private", "2026-10-21T09:00")
    assert dash(client, other, "day", "2026-10-21")["occurrences"] == []
    assert client.get("/api/reminders", headers=other).json() == []
    assert client.get(f"/api/reminders/{r['id']}", headers=other).status_code == 404
    assert client.get(f"/api/reminders/{r['id']}", headers=auth).json()['title'] == 'Private'
    assert client.put(f"/api/reminders/{r['id']}", headers=other,
                      json={"title": "Hacked", "start_at": "2026-10-21T09:00"}).status_code == 404
    assert client.delete(f"/api/reminders/{r['id']}", headers=other).status_code == 404


def test_validation(client, auth):
    bad = client.post("/api/reminders", headers=auth, json={"title": "  ", "start_at": "2026-10-21T09:00"})
    assert bad.status_code == 422
    bad = client.post("/api/reminders", headers=auth, json={
        "title": "x", "start_at": "2026-10-21T09:00", "recurrence": "daily", "end_date": "2026-10-01"})
    assert bad.status_code == 422
