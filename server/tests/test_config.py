import pytest

from config import coerce_config


def test_coerce_config_clamps_numeric_values():
    config = coerce_config(
        {
            "monitor_index": -2,
            "fps": 200,
            "quality": 20,
            "scale": 2,
        }
    )

    assert config["monitor_index"] == 1
    assert config["fps"] == 120
    assert config["quality"] == 40
    assert config["scale"] == 1.0


def test_coerce_config_rejects_unknown_view_mode():
    config = coerce_config({"view_mode": "center"})

    assert config["view_mode"] == "fit"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ({"input_enabled": ""}, False),
        ({"input_enabled": "false"}, True),
        ({"touch_cursor": 0}, False),
        ({"touch_cursor": 1}, True),
    ],
)
def test_coerce_config_preserves_existing_bool_coercion(raw, expected):
    key = next(iter(raw))

    assert coerce_config(raw)[key] is expected
