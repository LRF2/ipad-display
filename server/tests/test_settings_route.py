import pytest
from fastapi import HTTPException

import routes.settings as settings_route


def test_patch_settings_updates_config_and_returns_settings(monkeypatch):
    calls = []

    monkeypatch.setattr(settings_route, "require_token", lambda token: calls.append(("token", token)))
    monkeypatch.setattr(settings_route, "update_config", lambda payload: calls.append(("payload", payload)))
    monkeypatch.setattr(
        settings_route,
        "settings_response",
        lambda viewport_width, viewport_height: {
            "viewport_width": viewport_width,
            "viewport_height": viewport_height,
        },
    )

    response = settings_route.patch_settings(
        token="abc",
        viewport_width=1024,
        viewport_height=768,
        payload={"fps": 30},
    )

    assert calls == [("token", "abc"), ("payload", {"fps": 30})]
    assert response == {"viewport_width": 1024, "viewport_height": 768}


def test_patch_settings_rejects_invalid_payload(monkeypatch):
    monkeypatch.setattr(settings_route, "require_token", lambda token: None)

    def raise_value_error(payload):
        raise ValueError("bad payload")

    monkeypatch.setattr(settings_route, "update_config", raise_value_error)

    with pytest.raises(HTTPException) as exc_info:
        settings_route.patch_settings(token="abc", payload={"fps": "fast"})

    assert exc_info.value.status_code == 400
