"""Server-owned activity classification and storage namespaces."""

import os


ENVIRONMENTS = ("development", "test", "staging", "production")


def activity_environment(value=None):
    value = os.environ.get("POKER_ENVIRONMENT", "development") if value is None else value
    if value not in ENVIRONMENTS:
        raise ValueError(f"POKER_ENVIRONMENT must be one of: {', '.join(ENVIRONMENTS)}")
    return value


def partition_key(partition, environment):
    activity_environment(environment)
    # Keep production's existing checkpoint/identity keys for restart continuity.
    return partition if environment == "production" else f"ENV#{environment}#{partition}"
