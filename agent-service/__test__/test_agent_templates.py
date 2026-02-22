import json
import unittest.mock as mock
from unittest.mock import MagicMock, patch

from agents.modeler_agent import ModelerAgent
from agents.coder_agent import CoderAgent
from agents.visualizer_agent import VisualizerAgent


class TestModelerAgentTemplates:
    def test_get_system_template_returns_string(self):
        agent = ModelerAgent()
        result = agent.get_system_template()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_system_template_mentions_markdown(self):
        agent = ModelerAgent()
        result = agent.get_system_template()
        assert "Markdown" in result

    def test_build_user_template_returns_string(self):
        agent = ModelerAgent()
        result = agent.build_user_template()
        assert isinstance(result, str)

    def test_build_user_template_contains_input_placeholder(self):
        agent = ModelerAgent()
        result = agent.build_user_template()
        assert "{input}" in result

    def test_build_user_template_contains_context_placeholder(self):
        agent = ModelerAgent()
        result = agent.build_user_template()
        assert "{context}" in result

    def test_format_response_returns_correct_type(self):
        agent = ModelerAgent()
        result = agent.format_response("model content")
        assert result["type"] == "math_model"

    def test_format_response_returns_correct_content(self):
        agent = ModelerAgent()
        result = agent.format_response("my model")
        assert result["content"] == "my model"

    def test_format_response_includes_engine_field(self):
        agent = ModelerAgent()
        result = agent.format_response("any")
        assert "engine" in result


class TestCoderAgentTemplates:
    def test_get_system_template_returns_string(self):
        agent = CoderAgent()
        result = agent.get_system_template()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_system_template_mentions_pulp(self):
        agent = CoderAgent()
        result = agent.get_system_template()
        assert "pulp" in result

    def test_format_response_returns_correct_type(self):
        agent = CoderAgent()
        result = agent.format_response("import pulp")
        assert result["type"] == "python_code"

    def test_format_response_returns_correct_content(self):
        agent = CoderAgent()
        result = agent.format_response("x = 1")
        assert result["content"] == "x = 1"

    def test_format_response_includes_engine_field(self):
        agent = CoderAgent()
        result = agent.format_response("code")
        assert "engine" in result


class TestVisualizerAgentTemplates:
    def test_get_visualization_system_template_returns_string(self):
        agent = VisualizerAgent()
        result = agent.get_visualization_system_template()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_visualization_system_template_mentions_matplotlib(self):
        agent = VisualizerAgent()
        result = agent.get_visualization_system_template()
        assert "matplotlib" in result

    def test_get_report_system_template_returns_string(self):
        agent = VisualizerAgent()
        result = agent.get_report_system_template()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_report_system_template_mentions_file_placeholder(self):
        agent = VisualizerAgent()
        result = agent.get_report_system_template()
        assert "[FILE:" in result

    def test_format_response_returns_correct_type(self):
        agent = VisualizerAgent()
        result = agent.format_response("# Report", {"chart.png": "abc"}, "import plt")
        assert result["type"] == "visualization_report"

    def test_format_response_returns_content(self):
        agent = VisualizerAgent()
        result = agent.format_response("# Report", {}, "")
        assert result["content"] == "# Report"

    def test_format_response_contains_generated_files(self):
        agent = VisualizerAgent()
        files = {"a.png": "base64data"}
        result = agent.format_response("report", files, "code")
        assert result["generated_files"] == files

    def test_format_response_contains_visualization_code(self):
        agent = VisualizerAgent()
        result = agent.format_response("report", {}, "plt.plot()")
        assert result["visualization_code"] == "plt.plot()"

    def test_format_response_includes_engine_field(self):
        agent = VisualizerAgent()
        result = agent.format_response("report", {}, "code")
        assert "engine" in result
