from abc import abstractmethod, ABC
from typing import List, Dict, Any


class Agent(ABC):
    @abstractmethod
    async def run(
        self,
        prompt: str,
        job_id: str,
        context: str = "",
        conversation_history: List[Dict[str, Any]] = None,
        accepted_model: str = "",
        accepted_code: str = "",
    ) -> dict:
        pass
