import json
from typing import Any, Dict


def load_dataset(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_dataset(dataset: Dict[str, Any]) -> None:
    required = ["X_train", "y_train", "X_test", "y_test", "taskType"]
    missing = [key for key in required if key not in dataset]
    if missing:
        raise ValueError(f"Dataset payload missing required keys: {', '.join(missing)}")

    x_train = dataset["X_train"]
    x_test = dataset["X_test"]
    y_train = dataset["y_train"]
    y_test = dataset["y_test"]

    if not x_train or not x_test:
        raise ValueError("Dataset payload must include at least one train row and one test row")

    train_width = len(x_train[0])
    test_width = len(x_test[0])
    if train_width == 0 or test_width == 0:
        raise ValueError("Dataset payload must include at least one feature column")

    if any(len(row) != train_width for row in x_train):
        raise ValueError("X_train rows must all have the same feature width")

    if any(len(row) != test_width for row in x_test):
        raise ValueError("X_test rows must all have the same feature width")

    if train_width != test_width:
        raise ValueError("X_train and X_test must have the same feature width")

    if len(y_train) != len(x_train):
        raise ValueError("y_train length must match X_train row count")

    if len(y_test) != len(x_test):
        raise ValueError("y_test length must match X_test row count")
