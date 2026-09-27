"""Build sidecar Python menjadi binary tunggal (PyInstaller) dan salin ke
apps/desktop/src-tauri/binaries/tradesight-sidecar-<target-triple>[.exe]
sesuai konvensi `externalBin` Tauri.

Pemakaian:  python scripts/build_sidecar.py [--target <rust-target-triple>]
"""
import argparse
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIDECAR = ROOT / "services" / "sidecar"
BIN_DIR = ROOT / "apps" / "desktop" / "src-tauri" / "binaries"


# modul besar yang tidak dipakai sidecar — dikecualikan agar binary ramping
EXCLUDES = ["IPython", "jupyter", "notebook", "matplotlib", "tkinter", "scipy", "PIL",
            "pytest", "sqlalchemy", "numba", "pyarrow", "tornado", "zmq", "lxml", "sympy"]


def host_triple() -> str:
    try:
        out = subprocess.check_output(["rustc", "-vV"], text=True)
        for line in out.splitlines():
            if line.startswith("host:"):
                return line.split(":", 1)[1].strip()
    except Exception:
        pass
    m = platform.machine().lower()
    arch = "aarch64" if m in ("arm64", "aarch64") else "x86_64"
    if sys.platform == "win32":
        return f"{arch}-pc-windows-msvc"
    if sys.platform == "darwin":
        return f"{arch}-apple-darwin"
    return f"{arch}-unknown-linux-gnu"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default=None)
    args = ap.parse_args()
    triple = args.target or host_triple()

    subprocess.check_call([
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onefile",
        "--name", "tradesight-sidecar",
        "--collect-submodules", "uvicorn",
        "--collect-submodules", "websockets",
        "--hidden-import", "app.main",
        *sum((["--exclude-module", m] for m in EXCLUDES), []),
        "--paths", str(SIDECAR),
        str(SIDECAR / "run_sidecar.py"),
    ], cwd=SIDECAR)

    ext = ".exe" if sys.platform == "win32" else ""
    src = SIDECAR / "dist" / f"tradesight-sidecar{ext}"
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    dst = BIN_DIR / f"tradesight-sidecar-{triple}{ext}"
    shutil.copy2(src, dst)
    print(f"Sidecar siap: {dst}")


if __name__ == "__main__":
    main()
