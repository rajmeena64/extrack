from pathlib import Path
from typing import Union
import polars as pl

def write_parquet(df: pl.DataFrame, destination: Union[str, Path]) -> None:
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.write_parquet(path)

def read_parquet(source: Union[str, Path]) -> pl.DataFrame:
    return pl.read_parquet(source)
