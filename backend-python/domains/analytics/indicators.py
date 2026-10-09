import polars as pl

def calculate_ema(df: pl.DataFrame, period: int, price_col: str = "close") -> pl.Series:
    return df[price_col].ewm_mean(span=period, adjust=False)

def calculate_sma(df: pl.DataFrame, period: int, price_col: str = "close") -> pl.Series:
    return df[price_col].rolling_mean(window_size=period)

def calculate_rsi(df: pl.DataFrame, period: int = 14, price_col: str = "close") -> pl.Series:
    diff = df[price_col].diff()
    gain = pl.when(diff > 0).then(diff).otherwise(0.0)
    loss = pl.when(diff < 0).then(-diff).otherwise(0.0)
    avg_gain = gain.ewm_mean(span=period, adjust=False)
    avg_loss = loss.ewm_mean(span=period, adjust=False)
    rs = avg_gain / pl.when(avg_loss == 0).then(1e-10).otherwise(avg_loss)
    return 100.0 - (100.0 / (1.0 + rs))
