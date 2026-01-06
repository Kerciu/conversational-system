from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import List, Dict, Any, Tuple
import pika
import json
import time
import os
import uuid
import base64

from agents.agent import Agent


class VisualizerAgent(Agent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite", temperature=0.1
        )
        self.rabbitmq_host = os.getenv("RABBITMQ_HOST", "localhost")
        self.rabbitmq_user = os.getenv("RABBITMQ_USER", "guest")
        self.rabbitmq_pass = os.getenv("RABBITMQ_PASS", "guest")
        self.sandbox_queue = os.getenv(
            "RABBITMQ_IN_QUEUE_SANDBOX", "code_execution_queue"
        )
        self.sandbox_result_queue = os.getenv(
            "RABBITMQ_OUT_QUEUE_SANDBOX", "code_execution_results_queue"
        )

    def _connect_rabbitmq(
        self,
    ) -> Tuple[
        pika.BlockingConnection, pika.adapters.blocking_connection.BlockingChannel
    ]:
        """Connect to RabbitMQ for sandbox communication. Testable with mocking."""
        credentials = pika.PlainCredentials(self.rabbitmq_user, self.rabbitmq_pass)
        parameters = pika.ConnectionParameters(
            host=self.rabbitmq_host, credentials=credentials
        )
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        channel.queue_declare(queue=self.sandbox_queue, durable=True)
        channel.queue_declare(queue=self.sandbox_result_queue, durable=True)
        return connection, channel

    def get_visualization_system_template(self) -> str:
        return """Jesteś ekspertem od analizy i wizualizacji danych (Data Analysis Visualization) i biblioteki Matplotlib.
Twój zadaniem jest napisać kod Python, który na podstawie WYNIKÓW z solwera wygeneruje pliki PNG z wykresami.

Zasady:
1. Przeanalizuj dostarczone 'WYNIKI URUCHOMIENIA KODU'. Wyciągnij z nich kluczowe liczby i nazwy zmiennych.
2. Wybierz najlepszy typ wykresu (np. wykres słupkowy dla ilości produktów, kołowy dla udziałów, liniowy dla czasu).
3. Użyj biblioteki 'matplotlib.pyplot'.
4. Kod MUSI zapisywać KAŻDY wykres BEZPOŚREDNIO do `/output/nazwa_pliku.png` (NIE twórz subdirectoriów!).
5. NIE używaj plt.show() (kod będzie uruchamiany na serwerze bez ekranu).
6. Podpisz osie i dodaj tytuł bazując na 'KONTEKŚCIE PROBLEMU'.
7. Wszystkie pliki zapisuj jako PNG bezpośrednio w /output/.
8. Na koniec wypisz na stdout listę wygenerowanych plików (TYLKO nazwy bez ścieżek): "GENERATED_FILES: file1.png,file2.png"

Zwróć TYLKO kod źródłowy Python, bez bloków markdown (```python), czysty tekst gotowy do uruchomienia."""

    def get_report_system_template(self) -> str:
        return """Jesteś ekspertem od analizy wyników optymalizacyjnych.
Twoim zadaniem jest napisać profesjonalne podsumowanie wyników w markdown, wskazując gdzie umieścić wykresy.

Zasady:
1. Napisz podsumowanie wyników problemu optymalizacyjnego.
2. Zaznacz gdzie powinny się znaleźć wykresy używając linii: "[FILE: filename.png]" (TYLKO nazwa pliku, BEZ ścieżek!).
3. Dla każdego wygenerowanego pliku PNG umieść odpowiednie "[FILE: ...]" gdzie powinien się pojawić ten plik.
4. Formatuj jako markdown z sekcjami, podsekcjami itp.
5. Bądź konkretny - opisz co każdy wykres przedstawia i jakie wnioski z niego wyciągać.
6. WAŻNE: W [FILE: ...] używaj TYLKO nazwy pliku (np. wykres.png), NIE używaj ścieżek (np. output/wykres.png)."""

    def encode_files_to_base64(self, sandbox_files: Dict[str, str]) -> Dict[str, str]:
        """Convert hex-encoded files from sandbox to base64 for JSON transport."""
        generated_files_base64 = {}
        for filename, hex_data in sandbox_files.items():
            try:
                binary_data = bytes.fromhex(hex_data)
                generated_files_base64[filename] = base64.b64encode(binary_data).decode(
                    "utf-8"
                )
                print(
                    f"[VisualizerAgent] Encoded file: {filename} ({len(binary_data)} bytes)"
                )
            except Exception as e:
                print(
                    f"[VisualizerAgent] Warning: Failed to encode file {filename}: {e}"
                )
        return generated_files_base64

    def format_response(
        self,
        report_markdown: str,
        generated_files_base64: Dict[str, str],
        visualization_code: str,
    ) -> dict:
        return {
            "type": "visualization_report",
            "content": report_markdown,
            "generated_files": generated_files_base64,
            "visualization_code": visualization_code,
            "engine": self.llm.model,
        }

    def _submit_code_to_sandbox(
        self, code: str, job_id: str, job_suffix: str = ""
    ) -> dict:
        """Submit code to sandbox and wait for result on a private response queue to avoid backend consumers."""

        sandbox_job_id = (
            f"{job_id}_{job_suffix}_{uuid.uuid4().hex}"
            if job_suffix
            else f"{job_id}_{uuid.uuid4().hex}"
        )

        print(f"[VisualizerAgent] Submitting code to sandbox for job {sandbox_job_id}")

        connection, channel = self._connect_rabbitmq()

        # Create exclusive, auto-delete response queue for this request
        result_queue = channel.queue_declare(queue="", exclusive=True, auto_delete=True)
        response_queue_name = result_queue.method.queue

        try:
            # Submit code to sandbox with responseQueue hint
            message = {
                "jobId": sandbox_job_id,
                "code": code,
                "responseQueue": response_queue_name,
            }
            channel.basic_publish(
                exchange="",
                routing_key=self.sandbox_queue,
                body=json.dumps(message),
                properties=pika.BasicProperties(delivery_mode=2),
            )
            print(
                f"[VisualizerAgent] Code submitted to sandbox for job {sandbox_job_id} (response queue: {response_queue_name})"
            )

            # Wait for result from sandbox (with timeout)
            result = None
            timeout = 60  # seconds
            start_time = time.time()

            def result_callback(ch, method, properties, body):
                nonlocal result
                message_data = json.loads(body)
                if message_data.get("jobId") == sandbox_job_id:
                    result = message_data
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    ch.stop_consuming()
                else:
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

            channel.basic_consume(
                queue=response_queue_name,
                on_message_callback=result_callback,
                auto_ack=False,
            )

            while result is None and (time.time() - start_time) < timeout:
                try:
                    channel.connection.process_data_events(time_limit=1)
                except Exception:
                    pass

            if result is None:
                raise Exception(f"Sandbox execution timeout for job {sandbox_job_id}")

            print(f"[VisualizerAgent] Got sandbox result for job {sandbox_job_id}")
            return result

        finally:
            connection.close()

    async def run(
        self,
        prompt: str,
        job_id: str,
        context: str = "",
        conversation_history: List[Dict[str, Any]] = None,
        accepted_model: str = "",
        accepted_code: str = "",
    ) -> dict:
        """
        Execute visualizer workflow:
        1. (Optional) execute solver code in sandbox to get input data if accepted_code is provided
        2. Generate visualization code based on solver output + accepted model + user instructions
        3. Run visualization code in sandbox and collect PNG files
        4. Generate markdown report indicating where to insert PNGs ([FILE: ...])
        """
        print(f"[VisualizerAgent] Starting visualization for job {job_id}")

        if conversation_history is None:
            conversation_history = []

        user_request = prompt

        # STEP 0: Execute solver code if provided
        if accepted_code:
            execution_output = await self._execute_solver(accepted_code, job_id, prompt)
        else:
            # No code to execute - results are already in conversation_history
            execution_output = ""

        # STEP 1: Generate visualization code
        visualization_code = await self._generate_visualization_code(
            execution_output,
            context,
            user_request,
            conversation_history,
            accepted_model,
        )

        # STEP 2: Execute visualization code in sandbox
        sandbox_result = self._submit_code_to_sandbox(visualization_code, job_id, "viz")
        sandbox_output, sandbox_files = self._extract_sandbox_results(sandbox_result)

        # STEP 3: Generate final report
        report_markdown = await self._generate_final_report(
            execution_output, sandbox_output, user_request, accepted_model
        )

        # Encode files and format response
        generated_files_base64 = self.encode_files_to_base64(sandbox_files)

        return self.format_response(
            report_markdown, generated_files_base64, visualization_code
        )

    async def _execute_solver(
        self, accepted_code: str, job_id: str, prompt: str
    ) -> str:
        print("[VisualizerAgent] Step 0: Executing solver code in sandbox")
        solver_result = self._submit_code_to_sandbox(accepted_code, job_id, "solver")

        if solver_result.get("status") == "CODE_FAILED":
            error_msg = solver_result.get("generatedCode", {}).get(
                "stderr", "Unknown error"
            )
            print(f"[VisualizerAgent] Solver execution failed: {error_msg}")
            raise Exception(f"Solver code execution failed: {error_msg}")

        execution_output = solver_result.get("generatedCode", {}).get("stdout", "")
        print("[VisualizerAgent] Step 0 complete: Solver output captured")
        return execution_output

    async def _generate_visualization_code(
        self,
        execution_output: str,
        context: str,
        user_request: str,
        conversation_history: List[Dict[str, Any]],
        accepted_model: str,
    ) -> str:
        """Generate visualization code using LLM. Separated for easier testing."""
        print("[VisualizerAgent] Step 1: Generating visualization code")

        messages = [SystemMessage(content=self.get_visualization_system_template())]

        if accepted_model:
            messages.append(
                HumanMessage(
                    content=f"Zaakceptowany model matematyczny:\n\n{accepted_model}"
                )
            )

        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

        # Use detailed template only when we have execution output (first call with solver results)
        # Otherwise use simple template for follow-up requests
        if execution_output:
            user_template = """=== KONTEKST PROBLEMU (do etykiet i tytułów) ===
{context}

=== WYNIKI URUCHOMIENIA KODU (dane do wykresów) ===
{input}

=== POLECENIA UŻYTKOWNIKA ===
{user_request}"""
            template_vars = {
                "input": execution_output,
                "context": context,
                "user_request": user_request,
            }
        else:
            # Follow-up request - results are in conversation_history
            user_template = "{user_request}"
            template_vars = {"user_request": user_request}

        prompt_template = ChatPromptTemplate.from_messages(
            messages + [("user", user_template)]
        )

        chain = prompt_template | self.llm | StrOutputParser()
        visualization_code = await chain.ainvoke(template_vars)

        visualization_code = self.clean_code_output(visualization_code)
        print("[VisualizerAgent] Step 1 complete: Generated visualization code")
        return visualization_code

    def _extract_sandbox_results(
        self, sandbox_result: dict
    ) -> Tuple[str, Dict[str, str]]:
        """Extract stdout and files from sandbox result. Testable without sandbox."""
        print(f"[VisualizerAgent] Raw sandbox_result keys: {sandbox_result.keys()}")
        print(
            f"[VisualizerAgent] sandbox_result['generatedCode'] keys: {sandbox_result.get('generatedCode', {}).keys() if sandbox_result.get('generatedCode') else 'None'}"
        )

        if sandbox_result.get("status") == "CODE_FAILED":
            error_msg = sandbox_result.get("generatedCode", {}).get(
                "stderr", "Unknown error"
            )
            print(f"[VisualizerAgent] Sandbox execution failed: {error_msg}")
            raise Exception(f"Visualization code execution failed: {error_msg}")

        sandbox_output = sandbox_result.get("generatedCode", {}).get("stdout", "")
        sandbox_files = sandbox_result.get("generatedCode", {}).get(
            "generatedFiles", {}
        )

        print(f"[VisualizerAgent] Step 2 complete. Sandbox output: {sandbox_output}")
        print(f"[VisualizerAgent] Generated files: {list(sandbox_files.keys())}")
        print(f"[VisualizerAgent] sandbox_files type: {type(sandbox_files)}")

        return sandbox_output, sandbox_files

    async def _generate_final_report(
        self,
        execution_output: str,
        sandbox_output: str,
        user_request: str,
        accepted_model: str,
    ) -> str:
        """Generate final markdown report with LLM. Separated for easier testing."""
        print("[VisualizerAgent] Step 3: Generating final report with explanations")

        report_messages = [SystemMessage(content=self.get_report_system_template())]

        if accepted_model:
            report_messages.append(
                HumanMessage(content=f"Model matematyczny:\n\n{accepted_model}")
            )

        report_messages.append(
            HumanMessage(
                content=f"""Wyniki z solwera:
{execution_output}

Wygenerowane pliki:
{sandbox_output}

Instrukcje użytkownika:
{user_request}

Wygeneruj podsumowanie wyników z wskazówkami gdzie umieścić wykresy."""
            )
        )

        report_prompt = ChatPromptTemplate.from_messages(report_messages)
        report_chain = report_prompt | self.llm | StrOutputParser()
        report_markdown = await report_chain.ainvoke({})

        print("[VisualizerAgent] Step 3 complete: Generated report")
        return report_markdown
