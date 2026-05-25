import os
from pypdf import PdfReader

pdf_files = [
    "Modul Kuliah Praktikum Minggu ke-7.pdf",
    "Modul4.1_Deploy_Backend_KasRW.pdf",
    "Modul4.2_Deploy_KasRW_EC2.pdf",
    "Modul4.3_Dockerisasi_KasRW.pdf",
    "Modul_Kuliah_Praktek_CC_Pekan_5 (1).pdf"
]

for pdf in pdf_files:
    if os.path.exists(pdf):
        print(f"Reading {pdf}...")
        reader = PdfReader(pdf)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        output_name = pdf.replace(".pdf", ".md").replace(" ", "_")
        with open(output_name, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Saved {output_name}")
    else:
        print(f"Not found: {pdf}")
