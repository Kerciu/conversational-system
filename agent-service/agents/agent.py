from abc import ABC, abstractmethod
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


class Agent(ABC):
    @staticmethod
    def build_message_history(
        system_template: str,
        conversation_history: List[Dict[str, Any]],
        accepted_model: str = "",
        accepted_code: str = "",
    ) -> List:
        """Build message history from system template and conversation.
        Common utility for all agents to avoid code duplication."""
        messages = [SystemMessage(content=system_template)]

        if accepted_model:
            messages.append(
                HumanMessage(
                    content=f"Zaakceptowany model matematyczny:\n\n{accepted_model}"
                )
            )

        if accepted_code:
            messages.append(
                HumanMessage(
                    content=f"Zaakceptowany kod do implementacji:\n\n{accepted_code}"
                )
            )

        for msg in conversation_history or []:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

        return messages

    @staticmethod
    def clean_code_output(response: str) -> str:
        """Remove markdown code blocks from LLM response.
        Testable without LLM."""
        return response.replace("```python", "").replace("```", "").strip()

    @abstractmethod
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
        pass
