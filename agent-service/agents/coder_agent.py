from agents.agent import Agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import List, Dict, Any


class CoderAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.0)

    async def run(self, prompt: str, job_id: str, context: str = "", conversation_history: List[Dict[str, Any]] = None) -> dict:
        print(f"[CoderAgent] Generating code for job {job_id}")
        if conversation_history is None:
            conversation_history = []

        system_template = """
        Jesteś ekspertem programistą Python i Badań Operacyjnych.
        Twój cel: Napisać kompletny, wykonywalny kod w Pythonie, który rozwiązuje podany model matematyczny.
        
        Użyj biblioteki 'pulp' lub 'ortools'.
        Kod musi:
        1. Definiować zmienne.
        2. Definiować funkcję celu.
        3. Definiować ograniczenia.
        4. Rozwiązywać problem (solver).
        5. Wypisywać wynik na standardowe wyjście (print).
        
        Zwróć TYLKO kod źródłowy, bez bloków markdown (```python), czysty tekst gotowy do zapisu w pliku .py.
        
        Jeśli zostanie dostarczona historia konwersacji, weź pod uwagę poprzednie wiadomości i kontekst.
        """

        # Budowanie wiadomości z historią konwersacji
        messages = [("system", system_template)]
        
        # Dodanie poprzednich wiadomości z historii
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(("user", content))
            elif role == "assistant":
                messages.append(("assistant", content))
        
        # Dodanie aktualnego promptu
        messages.append(("user", "Oto model matematyczny do implementacji:\n{input}"))

        prompt_template = ChatPromptTemplate.from_messages(messages)

        chain = prompt_template | self.llm | StrOutputParser()

        response = await chain.ainvoke({"input": prompt})

        # Proste czyszczenie markdowna jeśli LLM jednak go doda
        cleaned_code = response.replace("```python", "").replace("```", "").strip()

        print(f"[CoderAgent] Job {job_id} finished.")
        return {
            "type": "python_code",
            "content": cleaned_code,
            "engine": "gemini-2.5-flash",
        }
