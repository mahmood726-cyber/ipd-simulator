from pathlib import Path


APP_HTML = Path(__file__).resolve().parents[1] / "index.html"


def test_app_shell_contains_required_controls():
    html = APP_HTML.read_text(encoding="utf-8")
    required_markers = [
        "<title>IPD Simulator",
        'id="btn-km"',
        'id="btn-binary"',
        'id="btn-continuous"',
        'id="km-run"',
        'id="bin-run"',
        "function",
    ]
    missing = [marker for marker in required_markers if marker not in html]
    assert missing == []
