import asyncio
from google import genai
from app.core.config import settings


def _client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def generate_summary(period: str, tasks_data: list[dict]) -> str:
    client = _client()

    created = [t for t in tasks_data if t["event"] == "created"]
    completed = [t for t in tasks_data if t["event"] == "completed"]
    updated = [t for t in tasks_data if t["event"] == "updated"]

    def fmt(tasks: list[dict]) -> str:
        if not tasks:
            return "  (none)"
        return "\n".join(f"  - {t['title']} [{t['priority']} priority, status: {t['status']}]" for t in tasks)

    prompt = (
        f"You are a project management assistant. Generate a brief, friendly summary of task activity for the past {period}.\n\n"
        f"Newly created tasks:\n{fmt(created)}\n\n"
        f"Completed tasks:\n{fmt(completed)}\n\n"
        f"Updated tasks (status or details changed):\n{fmt(updated)}\n\n"
        "Write 2-4 sentences in a professional but friendly tone. "
        "Highlight key achievements, what's in progress, and any concerns (overdue, high-priority tasks not started). "
        "Do not use bullet points — write as flowing text."
    )

    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text.strip()


async def estimate_task_time(
    title: str,
    description: str | None,
    priority: str,
    subtasks: list[str],
) -> str:
    client = _client()
    subtask_text = "\n".join(f"- {s}" for s in subtasks) if subtasks else "None"
    prompt = (
        "You are a project management assistant. Estimate how long this task will take to complete.\n\n"
        f"Task: {title}\n"
        f"Description: {description or 'No description'}\n"
        f"Priority: {priority}\n"
        f"Subtasks:\n{subtask_text}\n\n"
        "Respond with ONLY a short time estimate (e.g. '~2 hours', '1-2 days', '30 minutes'). "
        "No explanations, no punctuation at the end."
    )

    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text.strip()
