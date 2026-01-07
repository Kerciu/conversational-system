from agents.agent import Agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import List, Dict, Any


class ModelerAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite", temperature=0.2
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
        conversation_history: List[Dict[str, Any]] = None,
        accepted_model: str = "",
        accepted_code: str = "",
    ) -> dict:
        print(f"[ModelerAgent] Processing job {job_id}")

        messages = self.build_message_history(
            self.get_system_template(), conversation_history or [], accepted_model
        )

        prompt_template = ChatPromptTemplate.from_messages(
            messages + [("user", self.build_user_template())]
        )

        chain = prompt_template | self.llm | StrOutputParser()
        response = await chain.ainvoke({"input": prompt, "context": context})

        return self.format_response(response)

    def format_response(self, response: str) -> dict:
        """Format LLM response as agent output. Testable without LLM."""
        return {
            "type": "math_model",
            "content": response,
            "engine": self.llm.model,
        }
