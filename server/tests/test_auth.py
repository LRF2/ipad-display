import auth


def test_pair_rate_limit_after_five_failures():
    auth.reset_pair_failures()

    for _ in range(5):
        auth.record_pair_failure()

    assert auth.pair_rate_limited() is True
    auth.reset_pair_failures()


def test_reset_pair_failures_clears_rate_limit():
    auth.reset_pair_failures()

    for _ in range(5):
        auth.record_pair_failure()

    auth.reset_pair_failures()

    assert auth.pair_rate_limited() is False
