"""Unit tests for task status transition rules (mirrors backend logic)."""
from app.db.models import TaskStatus

ALLOWED: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.to_do: {TaskStatus.in_progress},
    TaskStatus.in_progress: {TaskStatus.done, TaskStatus.to_do},
    TaskStatus.done: set(),
}


def can_transition(current: TaskStatus, target: TaskStatus) -> bool:
    return target in ALLOWED.get(current, set())


# ---------------------------------------------------------------------------
# to_do
# ---------------------------------------------------------------------------

def test_to_do_to_in_progress_allowed():
    assert can_transition(TaskStatus.to_do, TaskStatus.in_progress) is True


def test_to_do_to_done_not_allowed():
    assert can_transition(TaskStatus.to_do, TaskStatus.done) is False


def test_to_do_to_to_do_not_allowed():
    assert can_transition(TaskStatus.to_do, TaskStatus.to_do) is False


# ---------------------------------------------------------------------------
# in_progress
# ---------------------------------------------------------------------------

def test_in_progress_to_done_allowed():
    assert can_transition(TaskStatus.in_progress, TaskStatus.done) is True


def test_in_progress_to_to_do_allowed():
    assert can_transition(TaskStatus.in_progress, TaskStatus.to_do) is True


def test_in_progress_to_in_progress_not_allowed():
    assert can_transition(TaskStatus.in_progress, TaskStatus.in_progress) is False


# ---------------------------------------------------------------------------
# done — terminal state
# ---------------------------------------------------------------------------

def test_done_to_to_do_not_allowed():
    assert can_transition(TaskStatus.done, TaskStatus.to_do) is False


def test_done_to_in_progress_not_allowed():
    assert can_transition(TaskStatus.done, TaskStatus.in_progress) is False


def test_done_to_done_not_allowed():
    assert can_transition(TaskStatus.done, TaskStatus.done) is False


# ---------------------------------------------------------------------------
# Sanity: all statuses covered
# ---------------------------------------------------------------------------

def test_all_statuses_present_in_transition_table():
    for status in TaskStatus:
        assert status in ALLOWED, f"{status} missing from ALLOWED transitions"
