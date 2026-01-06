"""
Unit tests for agent utility functions.
Tests message building, code cleaning, response formatting, and file encoding.
"""

import pytest
from agents.agent import Agent
from agents.modeler_agent import ModelerAgent
from agents.coder_agent import CoderAgent
from agents.visualizer_agent import VisualizerAgent


class TestAgentBaseUtilities:
    """Test Agent base class utility methods"""

    def test_build_message_history_basic(self):
        """Test basic message history building with conversation"""
        system_template = "You are a helpful assistant."
        conversation_history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]

        messages = Agent.build_message_history(system_template, conversation_history)

        assert len(messages) == 3
        assert messages[0].content == system_template
        assert messages[1].content == "Hello"
        assert messages[2].content == "Hi there!"

    def test_build_message_history_with_accepted_model(self):
        """Test message history with accepted model context"""
        system_template = "You are a modeler."
        conversation_history = []
        accepted_model = "Maximize: x + y"

        messages = Agent.build_message_history(
            system_template, conversation_history, accepted_model=accepted_model
        )

        assert len(messages) == 2
        assert "Zaakceptowany model matematyczny" in messages[1].content
        assert "Maximize: x + y" in messages[1].content

    def test_build_message_history_with_accepted_code(self):
        """Test message history with accepted code context"""
        system_template = "You are a coder."
        conversation_history = []
        accepted_code = "print('hello')"

        messages = Agent.build_message_history(
            system_template, conversation_history, accepted_code=accepted_code
        )

        assert len(messages) == 2
        assert "Zaakceptowany kod" in messages[1].content
        assert "print('hello')" in messages[1].content

    def test_build_message_history_empty_conversation(self):
        """Test with empty conversation history returns only system message"""
        system_template = "System message"
        messages = Agent.build_message_history(system_template, [])

        assert len(messages) == 1
        assert messages[0].content == system_template

    def test_clean_code_output_with_markdown(self):
        """Test cleaning removes markdown code blocks"""
        dirty_code = "```python\nprint('hello')\n```"
        cleaned = Agent.clean_code_output(dirty_code)

        assert cleaned == "print('hello')"
        assert "```" not in cleaned

    def test_clean_code_output_without_markdown(self):
        """Test cleaning preserves clean code unchanged"""
        clean_code = "print('hello')"
        result = Agent.clean_code_output(clean_code)

        assert result == clean_code

    def test_clean_code_output_multiple_blocks(self):
        """Test cleaning handles multiple markdown blocks"""
        dirty_code = "```python\nprint('hello')\n```\n\n```python\nprint('world')\n```"
        cleaned = Agent.clean_code_output(dirty_code)

        assert "```" not in cleaned
        assert "print('hello')" in cleaned
        assert "print('world')" in cleaned


class TestModelerAgentUtilities:
    """Test ModelerAgent utility methods"""

    def test_format_response(self):
        """Test response structure and field types"""
        agent = ModelerAgent()
        response = agent.format_response("Some math model")

        assert response["type"] == "math_model"
        assert response["content"] == "Some math model"
        # assert response["engine"] == "gemini-2.5-flash-lite"


class TestCoderAgentUtilities:
    """Test CoderAgent utility methods"""

    def test_format_response(self):
        """Test response structure and field types"""
        agent = CoderAgent()
        code = "import pulp\nprint('hello')"
        response = agent.format_response(code)

        assert response["type"] == "python_code"
        assert response["content"] == code
        # assert response["engine"] == "gemini-2.5-flash-lite"


class TestVisualizerAgentUtilities:
    """Test VisualizerAgent utility methods"""

    def test_encode_files_to_base64_single_file(self):
        """Test hex to base64 conversion for PNG files"""
        agent = VisualizerAgent()

        # Minimal PNG signature in hex (89 50 4E 47 0D 0A 1A 0A)
        hex_data = "89504e470d0a1a0a"
        sandbox_files = {"test.png": hex_data}

        result = agent.encode_files_to_base64(sandbox_files)

        assert "test.png" in result
        # Base64 of PNG signature should start with "iVBORw"
        assert result["test.png"].startswith("iVBORw")

    def test_encode_files_to_base64_multiple_files(self):
        """Test batch encoding of multiple files"""
        agent = VisualizerAgent()

        sandbox_files = {
            "chart1.png": "89504e470d0a1a0a",
            "chart2.png": "89504e470d0a1a0a",
        }

        result = agent.encode_files_to_base64(sandbox_files)

        assert len(result) == 2
        assert "chart1.png" in result
        assert "chart2.png" in result

    def test_encode_files_to_base64_invalid_hex(self):
        """Test encoding handles invalid hex data gracefully"""
        agent = VisualizerAgent()

        sandbox_files = {"bad.png": "not_valid_hex"}

        result = agent.encode_files_to_base64(sandbox_files)

        # Should return empty dict or skip bad file
        assert "bad.png" not in result or result == {}

    def test_format_response(self):
        """Test response structure with all required fields"""
        agent = VisualizerAgent()

        report = "# Results\n[FILE: chart.png]"
        files = {"chart.png": "aGVsbG8="}
        code = "import matplotlib.pyplot as plt"

        response = agent.format_response(report, files, code)

        assert response["type"] == "visualization_report"
        assert response["content"] == report
        assert response["generated_files"] == files
        assert response["visualization_code"] == code
        # assert response["engine"] == "gemini-2.5-flash-lite"

    def test_extract_sandbox_results_success(self):
        """Test extracting stdout and files from successful execution"""
        agent = VisualizerAgent()

        sandbox_result = {
            "status": "CODE_SUCCESS",
            "generatedCode": {
                "stdout": "Generated files: chart.png",
                "generatedFiles": {"chart.png": "89504e47"},
            },
        }

        stdout, files = agent._extract_sandbox_results(sandbox_result)

        assert stdout == "Generated files: chart.png"
        assert "chart.png" in files
        assert files["chart.png"] == "89504e47"

    def test_extract_sandbox_results_failure(self):
        """Test extraction raises exception on failed execution"""
        agent = VisualizerAgent()

        sandbox_result = {
            "status": "CODE_FAILED",
            "generatedCode": {"stderr": "Python syntax error"},
        }

        with pytest.raises(Exception) as exc_info:
            agent._extract_sandbox_results(sandbox_result)

        assert "Visualization code execution failed" in str(exc_info.value)
        assert "Python syntax error" in str(exc_info.value)
