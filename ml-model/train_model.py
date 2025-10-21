"""Utility to refresh synthetic samples and train the LSTM predictor."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _project_root() -> Path:
    return Path(__file__).resolve().parent


def _ensure_path() -> None:
    sys.path.append(str(_project_root()))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--refresh-samples",
        action="store_true",
        help="Regenerate synthetic snapshots before training.",
    )
    parser.add_argument(
        "--sequence-length",
        type=int,
        default=None,
        help="Override LSTM sequence length (defaults to env/config).",
    )
    args = parser.parse_args(argv)

    _ensure_path()

    from data import generate_sample_data
    from models.predictor import PollenPredictor

    if args.refresh_samples:
        print("↻ Generating synthetic sample datasets...")
        generate_sample_data.main()

    predictor = PollenPredictor()
    if args.sequence_length:
        predictor.sequence_length = args.sequence_length

    print("🎓 Training LSTM predictor...")
    metrics = predictor.train()
    print("✓ Training complete")
    for key, value in metrics.items():
        print(f"  - {key}: {value}")


if __name__ == "__main__":
    main()
