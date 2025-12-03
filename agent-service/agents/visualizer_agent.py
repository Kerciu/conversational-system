from agents.agent import Agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


class VisualizerAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1)

    async def run(self, execution_output: str, job_id: str, context: str = "") -> dict:
        """
        execution_output: CoderAgent's output
        context: original problem context for labeling
        job_id: id of the job for RabbbitMQ tracking
        """
        print(f"[VisualizerAgent] Generating visualization code for job {job_id}")

        system_template = """
        Jesteś ekspertem od analizy i wizualizacji danych (Data Analysis Visualization) i biblioteki Matplotlib.
        Twój cel: Napisać krótki skrypt w Pythonie, który na podstawie tekstowych WYNIKÓW z solera wygeneruje plik z wykresem.

        Zasady:
        1. Przeanalizuj dostarczone 'WYNIKI URUCHOMIENIA KODU'. Wyciągnij z nich kluczowe liczby i nazwy zmiennych.
        2. Wybierz najlepszy typ wykresu (np. wykres słupkowy dla ilości produktów, kołowy dla udziałów, liniowy dla czasu).
        3. Użyj biblioteki 'matplotlib.pyplot'.
        4. Kod MUSI zapisywać wykres do pliku 'visualization.png' (użyj plt.savefig('visualization.png')).
        5. NIE używaj plt.show() (kod będzie uruchamiany na serwerze bez ekranu).
        6. Podpisz osie i dodaj tytuł bazując na 'KONTEKŚCIE PROBLEMU'.
        
        Zwróć TYLKO kod źródłowy Python, bez bloków markdown, gotowy do uruchomienia.
        """

        user_template = """
        === KONTEKST PROBLEMU (do etykiet i tytułów) ===
        {context}
        
        === WYNIKI URUCHOMIENIA KODU (dane do wykresu) ===
        {input}
        """

        prompt_template = ChatPromptTemplate.from_messages(
            [("system", system_template), ("user", user_template)]
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