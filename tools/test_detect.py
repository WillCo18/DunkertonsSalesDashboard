
from detection import detect_all

desc = "Dunkertons DRY ORGANIC Cider BIB"
print(f"Detecting for: {desc}")
res = detect_all(desc)
print(res)
