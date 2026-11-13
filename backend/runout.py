"""Recorded PokerNow reveal schedules, in seconds from runout consent.

Once: pokernow_run_twice_demo.mov, hands 24.85, backs 28.98/32.93/37.18,
payout 40.85. Twice: new_run_it_twice.mov, hands 8.4, backs
12.45/16.45/20.45/24.55/28.55/32.65, payout 36.75.
Network delivery is not part of the animation duration.
"""
from functools import lru_cache
from itertools import combinations
from math import comb
from random import Random
from phevaluator.evaluator import evaluate_cards

FACE_DELAY = .175
FLOP_STAGGER = .175
FACE_DURATION = .1
RESULT_HOLD = {1: 6.1, 2: 8.1}


def schedule(prefix, count):
    starts = {1: [4.13, 8.08, 12.33], 2: [4.05, 8.05, 12.05, 16.15, 20.15, 24.25]}[count]
    payout = {1: 16.0, 2: 28.35}[count]
    # Shared streets do not replay. Retain the initial pause and each remaining
    # street's measured interval, including the pause between the two boards.
    skipped = 0.0
    steps = []
    for run in range(count):
        for street_index, (street, end, size) in enumerate((("flop", 3, 3), ("turn", 4, 1), ("river", 5, 1))):
            i = run * 3 + street_index
            if end <= prefix:
                following = starts[i + 1] if i + 1 < len(starts) else payout
                skipped += following - starts[i]
                continue
            at = starts[i] - skipped
            steps.append({"at": at, "kind": "backs", "run": run, "street": street, "size": size})
            for card in range(size):
                steps.append({"at": at + FACE_DELAY + card * FLOP_STAGGER,
                              "kind": "face", "run": run, "card": card})
    steps.append({"at": payout - skipped, "kind": "payout"})
    return steps


@lru_cache(maxsize=512)
def equity(hands, board, other_board=()):
    """Public-card pot equity. Never consult the real deck or folded hands.

    Enumerate flop/turn/river; deterministic sampling before the flop avoids
    blocking the reveal scheduler on millions of combinations.
    """
    known = set(board + other_board + tuple(c for hand in hands for c in hand))
    deck = [r + s for s in "hdcs" for r in "23456789TJQKA" if r + s not in known]
    missing = 5 - len(board)
    if comb(len(deck), missing) <= 2000:
        draws = combinations(deck, missing)
    else:
        rng = Random('|'.join(known_card for known_card in sorted(known)))
        draws = (rng.sample(deck, missing) for _ in range(2000))
    totals = [0.0] * len(hands)
    samples = 0
    for draw in draws:
        ranks = [evaluate_cards(*(list(hand) + list(board) + list(draw))) for hand in hands]
        best = min(ranks)
        winners = [i for i, rank in enumerate(ranks) if rank == best]
        for i in winners:
            totals[i] += 1 / len(winners)
        samples += 1
    return tuple(round(100 * total / samples) for total in totals)
