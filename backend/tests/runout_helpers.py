def finish_runout(table):
    """Advance a synchronous engine using its scheduled clock, without sleeping."""
    while table.runout:
        table.advance_runout(table.runout['started_at'] + table._runout_steps[0]['at'] + .000001)
