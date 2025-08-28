import pkgutil
import inspect
import json
import sys

# Force UTF-8 stdout to avoid codec errors on import-time prints
try:
    sys.stdout.reconfigure(encoding='utf-8')  # type: ignore[attr-defined]
except Exception:
    pass

info = {"version": None, "submodules": [], "exports": []}
try:
    import vnstock
    info["version"] = getattr(vnstock, "__version__", None)
    if hasattr(vnstock, "__path__"):
        info["submodules"] = [m.name for m in pkgutil.iter_modules(vnstock.__path__)]
    # Probe common names
    names = ["Screener","Finance","Financial","News","Company","Fundamental","Listing","Quote","Trading"]
    for n in names:
        info["exports"].append({n: hasattr(vnstock, n)})
except Exception as e:
    info["error"] = str(e)

print(json.dumps(info, ensure_ascii=False))
