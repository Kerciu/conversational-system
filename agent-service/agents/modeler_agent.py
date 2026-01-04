from agents.agent import Agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict, Any


class ModelerAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)

    async def run(self, prompt: str, job_id: str, context: str = "", conversation_history: List[Dict[str, Any]] = None, accepted_model: str = "", accepted_code: str = "") -> dict:
        print(f"[ModelerAgent] Processing job {job_id}")
        if conversation_history is None:
            conversation_history = []

        system_template = """
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

        # Budowanie wiadomości z historią konwersacji
        # System message
        messages = [SystemMessage(content=system_template)]
        
        # Dodanie poprzednich wiadomości z historii jako czysty tekst (nie template)
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
        
        # Tylko aktualny prompt użytkownika jest w template (może zawierać zmienne)
        user_template = """
        Sformułuj model matematyczny dla poniższego problemu.
        
        === MATERIAŁY REFERENCYJNE ===
        {context}
        =============================================
        
        OPIS PROBLEMU UŻYTKOWNIKA:
        {input}
        """
        prompt_template = ChatPromptTemplate.from_messages(
            messages + [("user", user_template)]
        )

        chain = prompt_template | self.llm | StrOutputParser()

        response = await chain.ainvoke({"input": prompt, "context": context})

        return {"type": "math_model", "content": response, "engine": "gemini-2.5-flash"}
