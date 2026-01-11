from typing import Any, Dict, List

from agents.agent import Agent
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI


class CoderAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite", temperature=0.0
        )

    def get_system_template(self) -> str:
        return """
        Jesteś ekspertem programistą Python i Badań Operacyjnych.
        Twój cel: Napisać kompletny, wykonywalny kod w Pythonie, który rozwiązuje podany model matematyczny.
        
        Użyj biblioteki 'pulp' lub 'ortools'.
        Kod musi:
        1. Definiować zmienne.
        2. Definiować funkcję celu.
        3. Definiować ograniczenia.
        4. Rozwiązywać problem (solver).
        5. Wypisywać wynik na standardowe wyjście (print).
        
        WAŻNE - Przy sprawdzaniu statusu solwera w PuLP:
        - Prawidłowo: if pulp.LpStatus[prob.status] == "Optimal": 
        - LUB: from pulp import PULP_CBC_CMD, LpStatusOptimal; if prob.status == LpStatusOptimal:
        - Źle: pulp.LpStatus.Optimal (to jest dict, nie ma atrybutu)
        - Prawidłowy print wyniku: print(f"Status: {pulp.LpStatus[prob.status]}")
        
        Zwróć TYLKO kod źródłowy, bez bloków markdown (```python), czysty tekst gotowy do zapisu w pliku .py.
        
        Jeśli zostanie dostarczona historia konwersacji, weź pod uwagę poprzednie wiadomości i kontekst.
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
        print(f"[CoderAgent] Generating code for job {job_id}")

        messages = self.build_message_history(
            self.get_system_template(), conversation_history or [], accepted_model
        )

        prompt_template = ChatPromptTemplate.from_messages(
            messages + [("user", "{input}")]
        )

        chain = prompt_template | self.llm | StrOutputParser()
        response = await chain.ainvoke({"input": prompt})

        cleaned_code = self.clean_code_output(response)

        print(f"[CoderAgent] Job {job_id} finished.")
        return self.format_response(cleaned_code)

    def format_response(self, cleaned_code: str) -> dict:
        return {
            "type": "python_code",
            "content": cleaned_code,
            "engine": self.llm.model,
        }
