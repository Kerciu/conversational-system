from abc import abstractmethod, ABC
import asyncio


class Agent(ABC):
    @abstractmethod
    async def run(self, prompt: str, job_id: str) -> dict:
        pass


class ModelerAgent(Agent):
    async def run(self, prompt: str, job_id: str) -> dict:
        print(f"[ModelerAgent] preparing job {job_id}")

        await asyncio.sleep(2)

        generated_model = f"Schema based on '{prompt}'"

        print(f"[ModelerAgent] completed job {job_id}")

        return {"generatedModel": generated_model, "engine": "model-v1"}
