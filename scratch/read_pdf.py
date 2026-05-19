import sys
import subprocess
import os

try:
    # pyrefly: ignore [missing-import]
    import pypdf
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
    # pyrefly: ignore [missing-import]
    import pypdf

def extract_pdf_text(filepath):
    print(f"Reading {filepath}...")
    try:
        reader = pypdf.PdfReader(filepath)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading {filepath}: {e}"

pdf_files = [
    r"c:\CCAnti\Modul Kuliah Praktikum Minggu ke-7.pdf",
    r"c:\CCAnti\Modul_Kuliah_Praktek_CC_Pekan_5 (1).pdf"
]

for pdf_file in pdf_files:
    text = extract_pdf_text(pdf_file)
    out_file = pdf_file + ".txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Saved text to {out_file}")

print("Done.")
