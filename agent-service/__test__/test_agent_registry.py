from agents.agent_registry import get_agent_class, AgentType, AGENT_REGISTRY
from agents.modeler_agent import ModelerAgent
from agents.coder_agent import CoderAgent
from agents.visualizer_agent import VisualizerAgent


class TestAgentRegistry:
    def test_get_modeler_agent_class(self):
        result = get_agent_class("MODELER_AGENT")
        assert result is ModelerAgent

    def test_get_coder_agent_class(self):
        result = get_agent_class("CODER_AGENT")
        assert result is CoderAgent

    def test_get_visualizer_agent_class(self):
        result = get_agent_class("VISUALIZER_AGENT")
        assert result is VisualizerAgent

    def test_returns_none_for_unknown_agent(self):
        result = get_agent_class("NON_EXISTENT_AGENT")
        assert result is None

    def test_returns_none_for_empty_string(self):
        result = get_agent_class("")
        assert result is None

    def test_registry_contains_all_agent_types(self):
        assert AgentType.MODELER_AGENT in AGENT_REGISTRY
        assert AgentType.CODER_AGENT in AGENT_REGISTRY
        assert AgentType.VISUALIZER_AGENT in AGENT_REGISTRY

    def test_registry_size_matches_enum(self):
        assert len(AGENT_REGISTRY) == len(AgentType)
