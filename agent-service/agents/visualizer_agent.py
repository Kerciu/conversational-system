from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import List, Dict, Any

from agents.agent import Agent


class VisualizerAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1)

    async def run(self, execution_output: str, job_id: str, context: str = "", conversation_history: List[Dict[str, Any]] = None) -> dict:
        """
        execution_output: CoderAgent's output
        context: original problem context for labeling
        job_id: id of the job for RabbbitMQ tracking
        conversation_history: lista poprzednich wiadomości z konwersacji
        """
        print(f"[VisualizerAgent] Generating visualization code for job {job_id}")
        if conversation_history is None:
            conversation_history = []

        system_template = """Jesteś ekspertem od analizy i wizualizacji danych (Data Analysis Visualization) i biblioteki Matplotlib.
Twój cel: Napisać krótki skrypt w Pythonie, który na podstawie tekstowych WYNIKÓW z solera wygeneruje plik z wykresem.

Zasady:
1. Przeanalizuj dostarczone 'WYNIKI URUCHOMIENIA KODU'. Wyciągnij z nich kluczowe liczby i nazwy zmiennych.
2. Wybierz najlepszy typ wykresu (np. wykres słupkowy dla ilości produktów, kołowy dla udziałów, liniowy dla czasu).
3. Użyj biblioteki 'matplotlib.pyplot'.
4. Kod MUSI zapisywać wykres do pliku 'visualization.png' (użyj plt.savefig('visualization.png')).
5. NIE używaj plt.show() (kod będzie uruchamiany na serwerze bez ekranu).
6. Podpisz osie i dodaj tytuł bazując na 'KONTEKŚCIE PROBLEMU'.

Zwróć TYLKO kod źródłowy Python, bez bloków markdown, gotowy do uruchomienia.

Jeśli zostanie dostarczona historia konwersacji, weź pod uwagę poprzednie wiadomości, aby lepiej zrozumieć kontekst i preferencje użytkownika."""

        # Budowanie wiadomości z historią konwersacji
        messages = [SystemMessage(content=system_template)]
        
        # Dodanie poprzednich wiadomości z historii jako czysty tekst
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
        
        # Tylko aktualny prompt w template
        user_template = """=== KONTEKST PROBLEMU (do etykiet i tytułów) ===
{context}

=== WYNIKI URUCHOMIENIA KODU (dane do wykresu) ===
{input}"""
        
        prompt_template = ChatPromptTemplate.from_messages(
            messages + [("user", user_template)]
        )

        chain = prompt_template | self.llm | StrOutputParser()
        response = await chain.ainvoke({"input": execution_output, "context": context})
        cleaned_code = response.replace("```python", "").replace("```", "").strip()

        print(f"[VisualizerAgent] Job {job_id} visualization code generated.")

        return {
            "type": "visualization_code",
            "content": cleaned_code,
            "engine": "gemini-2.5-flash",
        }
