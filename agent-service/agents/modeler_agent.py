from agents.agent import Agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

class ModelerAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.2
        )

    async def run(self, prompt: str, job_id: str, context: str = "") -> dict:
        print(f"[ModelerAgent] Processing job {job_id}")

        system_template = """
        Jesteś ekspertem Badań Operacyjnych (Operations Research).
        Twoim zadaniem jest sformułowanie modelu matematycznego.
        
        Zasady:
        - Zwróć TYLKO model matematyczny w formacie LaTeX.
        - Nie dodawaj wyjaśnień "Oto model...".
        """

        user_template = """
        Sformułuj model matematyczny dla poniższego problemu.
        
        === MATERIAŁY REFERENCYJNE ===
        {context}
        =============================================
        
        OPIS PROBLEMU UŻYTKOWNIKA:
        {input}
        """

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_template),
            ("user", user_template)
        ])

        chain = prompt_template | self.llm | StrOutputParser()

        response = await chain.ainvoke({"input": prompt, "context": context})
        
        return {
            "type": "math_model",
            "content": response,
            "engine": "gemini-2.5-flash"
        }