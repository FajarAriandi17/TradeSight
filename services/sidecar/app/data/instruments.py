"""Daftar instrumen MVP: 5 pair forex + 10 saham IDX blue-chip."""
from app.models.schemas import Instrument

# symbol internal -> (nama, asset class, presisi, simbol provider Yahoo)
_RAW = [
    ("EURUSD", "Euro / US Dollar", "forex", 5, "EURUSD=X"),
    ("GBPUSD", "British Pound / US Dollar", "forex", 5, "GBPUSD=X"),
    ("USDJPY", "US Dollar / Japanese Yen", "forex", 3, "JPY=X"),
    ("AUDUSD", "Australian Dollar / US Dollar", "forex", 5, "AUDUSD=X"),
    ("XAUUSD", "Gold / US Dollar", "forex", 2, "GC=F"),
    ("BBCA", "Bank Central Asia Tbk", "idx", 0, "BBCA.JK"),
    ("BBRI", "Bank Rakyat Indonesia Tbk", "idx", 0, "BBRI.JK"),
    ("BMRI", "Bank Mandiri Tbk", "idx", 0, "BMRI.JK"),
    ("BBNI", "Bank Negara Indonesia Tbk", "idx", 0, "BBNI.JK"),
    ("TLKM", "Telkom Indonesia Tbk", "idx", 0, "TLKM.JK"),
    ("ASII", "Astra International Tbk", "idx", 0, "ASII.JK"),
    ("UNVR", "Unilever Indonesia Tbk", "idx", 0, "UNVR.JK"),
    ("ICBP", "Indofood CBP Sukses Makmur Tbk", "idx", 0, "ICBP.JK"),
    ("ADRO", "Alamtri Resources Indonesia Tbk", "idx", 0, "ADRO.JK"),
    ("GOTO", "GoTo Gojek Tokopedia Tbk", "idx", 0, "GOTO.JK"),
]

INSTRUMENTS: dict[str, Instrument] = {
    s: Instrument(symbol=s, name=n, asset_class=a, precision=p, delayed=(a == "idx"))
    for s, n, a, p, _ in _RAW
}
YAHOO_SYMBOLS: dict[str, str] = {s: y for s, _, _, _, y in _RAW}
# simbol untuk tradingview-mcp (EXCHANGE:SYMBOL)
TV_SYMBOLS: dict[str, str] = {
    **{s: f"FX:{s}" for s, _, a, _, _ in _RAW if a == "forex" and s != "XAUUSD"},
    "XAUUSD": "OANDA:XAUUSD",
    **{s: f"IDX:{s}" for s, _, a, _, _ in _RAW if a == "idx"},
}


def get_instrument(symbol: str) -> Instrument | None:
    return INSTRUMENTS.get(symbol.upper())
