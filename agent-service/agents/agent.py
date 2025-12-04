from abc import abstractmethod, ABC


class Agent(ABC):
    @abstractmethod
    async def run(self, prompt: str, job_id: str, context: str = "") -> dict:
        pass
