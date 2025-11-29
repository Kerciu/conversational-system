from agents.agent import Agent
from agents.modeler_agent import ModelerAgent
from agents.coder_agent import CoderAgent
import enum


class AgentType(enum.Enum):
    MODELER_AGENT = "MODELER_AGENT"
    CODER_AGENT = "CODER_AGENT"


AGENT_REGISTRY: dict[AgentType, type[Agent]] = {
    AgentType.MODELER_AGENT: ModelerAgent,
    AgentType.CODER_AGENT: CoderAgent,
}


def get_agent_class(agent_type_str: str) -> type[Agent] | None:
    try:
        agent_type_enum = AgentType(agent_type_str)
        return AGENT_REGISTRY.get(agent_type_enum)

    except ValueError:
        print(f"Error: Unknown agent type '{agent_type_str}'")
        return None
