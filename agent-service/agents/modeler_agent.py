import asyncio
import shutil
import time
from typing import Any, Dict, List

from agents.agent import Agent
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai.embeddings import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


class ModelerAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite", temperature=0.2
        )
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004"
        )

    def get_system_template(self) -> str:
        """Get system prompt template. Testable without LLM."""
        return """
        Jesteś ekspertem Badań Operacyjnych (Operations Research).
        Twoim zadaniem jest sformułowanie modelu matematycznego.
        
        Zasady Formatowania:
        1. Używaj standardowego Markdown.
        2. **Każdy główny wzór matematyczny** (funkcja celu, ograniczenia) MUSI być:
           - W osobnej linii.
           - Wyśrodkowany (użyj bloku `$$ ... $$`).
           - Oddzielony pustą linią od tekstu powyżej i poniżej.
        3. NIE używaj wzorów inline (`$ ... $`) dla głównych równań. Używaj ich tylko dla małych symboli w opisach (np. $x_i$).
        4. Struktura odpowiedzi:
           - **Nagłówki sekcji**: Użyj `###` (np. `### Zmienne decyzyjne`).
           - **Opisy**: Użyj listy punktowanej (`-`).
           - **Odstępy**: Pamiętaj o pustej linii między każdą sekcją i każdym wzorem.
        5. NIE używaj bloku kodu ```latex ... ```.
        
        Bądź zwięzły, czytelny i profesjonalny.
        
        Jeśli zostanie dostarczona historia konwersacji, weź pod uwagę poprzednie wiadomości i kontekst, aby lepiej zrozumieć potrzeby użytkownika i doprecyzować model.
        """

    def build_rag_chain(self, file_paths: List[str]):
        documents = []
        for path in file_paths:
            if path.endswith(".pdf"):
                loader = PyPDFLoader(path)
            elif path.endswith(
                (
                    ".txt",
                    ".md",
                    ".csv",
                    ".json",
                )
            ):
                loader = TextLoader(path, encoding="utf-8")
            else:
                continue
            try:
                documents.extend(loader.load())
            except Exception as e:
                print(f"Error loading file {path}: {e}")

        if not documents:
            return None

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        )
        splits = text_splitter.split_documents(documents)

        vectorstore = Chroma(embedding_function=self.embeddings, persist_directory=None)

        batch_size = 5
        total_splits = len(splits)

        print(
            f"Starting vectorization of {total_splits} fragments through Google API..."
        )

        for i in range(0, total_splits, batch_size):
            batch = splits[i : i + batch_size]
            vectorstore.add_documents(batch)
            print(f"Processed {min(i + batch_size, total_splits)}/{total_splits}")
            time.sleep(2)

        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
        return retriever

    def build_user_template(self) -> str:
        """Get user prompt template. Testable without LLM."""
        return """
        Sformułuj model matematyczny dla poniższego problemu.
        
        === MATERIAŁY REFERENCYJNE ===
        {context}
        =============================================
        
        OPIS PROBLEMU UŻYTKOWNIKA:
        {input}
        """

    async def run(
        self,
        prompt: str,
        job_id: str,
        context: str = "",
        file_paths: List[str] | None = None,
        conversation_history: List[Dict[str, Any]] | None = None,
        accepted_model: str = "",
        accepted_code: str = "",
    ) -> dict:
        print(f"[ModelerAgent] Processing job {job_id}")

        unpack_files = True

        messages = self.build_message_history(
            self.get_system_template(), conversation_history or [], accepted_model
        )

        prompt_template = ChatPromptTemplate.from_messages(
            messages + [("user", self.build_user_template())]
        )

        retriever = None
        extracted_text = ""

        if file_paths:
            if unpack_files:
                print("[ModelerAgent] Mode: Unpack Files directly to context")
                for path in file_paths:
                    try:
                        content = ""
                        if path.endswith(".pdf"):
                            loader = PyPDFLoader(path)
                            pages = loader.load()
                            content = "\n".join([p.page_content for p in pages])
                        elif path.endswith(
                            (".txt", ".md", ".csv", ".json", ".py", ".java")
                        ):
                            loader = TextLoader(path, encoding="utf-8")
                            pages = loader.load()
                            content = "\n".join([p.page_content for p in pages])

                        if content:
                            extracted_text += f"\n--- PLIK: {path} ---\n{content}\n"
                    except Exception as e:
                        print(f"Error extracting text from {path}: {e}")
            else:
                print("[ModelerAgent] Mode: RAG (Vector Database)")
                print(f"Building RAG index for {len(file_paths)} files...")
                retriever = await asyncio.to_thread(self.build_rag_chain, file_paths)

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        final_user_input = prompt
        if extracted_text:
            final_user_input += (
                f"\n\n=== ZAŁĄCZONE PLIKI UŻYTKOWNIKA ===\n{extracted_text}"
            )

        if retriever:
            chain = (
                {
                    "retrieved_context": retriever | format_docs,
                    "input": RunnablePassthrough(),
                    "context": lambda x: context,
                }
                | prompt_template
                | self.llm
                | StrOutputParser()
            )
            response = await chain.ainvoke(final_user_input)
        else:
            chain = prompt_template | self.llm | StrOutputParser()
            response = await chain.ainvoke(
                {
                    "input": final_user_input,
                    "context": context,
                    "retrieved_context": "Brak dokumentów w bazie wiedzy (tryb bezpośredni lub brak plików).",
                }
            )

        if file_paths:
            shutil.rmtree(f"/tmp/jobs/{job_id}", ignore_errors=True)

        return self.format_response(response)

    def format_response(self, response: str) -> dict:
        """Format LLM response as agent output. Testable without LLM."""
        return {
            "type": "math_model",
            "content": response,
            "engine": self.llm.model,
        }
