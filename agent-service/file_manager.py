import io
import base64
from pypdf import PdfReader

def extract_text_from_files(files_data: list) -> str:
    if not files_data:
        return ""

    context_accumulated = "\n=== ZAŁĄCZONE PLIKI UŻYTKOWNIKA ===\n"

    for file_info in files_data:
        filename = file_info.get('name', 'unknown')
        b64_content = file_info.get('content', '')
        
        try:
            file_bytes = base64.b64decode(b64_content)
            extracted_text = ""

            if filename.lower().endswith('.pdf'):
                with io.BytesIO(file_bytes) as f:
                    reader = PdfReader(f)
                    for page in reader.pages:
                        text = page.extract_text()
                        if text:
                            extracted_text += text + "\n"
            
            elif filename.lower().endswith(('.txt', '.md', '.csv', '.json', '.py', '.java')):
                extracted_text = file_bytes.decode('utf-8')
            
            else:
                extracted_text = "[System: Format pliku nieobsługiwany, pominięto treść]"

            context_accumulated += f"\n--- PLIK: {filename} ---\n{extracted_text}\n"

        except Exception as e:
            print(f"Error processing file {filename}: {e}")
            context_accumulated += f"\n--- PLIK: {filename} (Błąd odczytu) ---\n"

    context_accumulated += "===================================\n"
    return context_accumulated