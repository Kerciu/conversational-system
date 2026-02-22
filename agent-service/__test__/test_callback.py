import json
from unittest.mock import MagicMock, patch, AsyncMock

from callback import callback


def make_channel_and_method():
    ch = MagicMock()
    method = MagicMock()
    method.delivery_tag = "tag-1"
    properties = MagicMock()
    return ch, method, properties


def make_body(overrides=None):
    data = {
        "jobId": "job-123",
        "agentType": "MODELER_AGENT",
        "prompt": "Solve this problem",
        "conversationHistory": [],
        "context": "",
        "acceptedModel": "",
        "acceptedCode": "",
        "files": [],
    }
    if overrides:
        data.update(overrides)
    return json.dumps(data).encode("utf-8")


class TestCallbackMessageParsing:
    def test_nacks_when_job_id_missing(self):
        ch, method, properties = make_channel_and_method()
        body = make_body({"jobId": None})

        callback(ch, method, properties, body)

        ch.basic_nack.assert_called_once_with(
            delivery_tag=method.delivery_tag, requeue=False
        )

    def test_nacks_when_agent_type_missing(self):
        ch, method, properties = make_channel_and_method()
        body = make_body({"agentType": None})

        callback(ch, method, properties, body)

        ch.basic_nack.assert_called_once_with(
            delivery_tag=method.delivery_tag, requeue=False
        )

    def test_nacks_when_prompt_missing(self):
        ch, method, properties = make_channel_and_method()
        body = make_body({"prompt": None})

        callback(ch, method, properties, body)

        ch.basic_nack.assert_called_once_with(
            delivery_tag=method.delivery_tag, requeue=False
        )

    def test_nacks_when_unknown_agent_type(self):
        ch, method, properties = make_channel_and_method()
        body = make_body({"agentType": "UNKNOWN_AGENT"})

        callback(ch, method, properties, body)

        ch.basic_nack.assert_called_once_with(
            delivery_tag=method.delivery_tag, requeue=False
        )

    def test_nacks_on_invalid_json(self):
        ch, method, properties = make_channel_and_method()

        callback(ch, method, properties, b"not valid json")

        ch.basic_nack.assert_called_once_with(
            delivery_tag=method.delivery_tag, requeue=False
        )

    @patch("callback.get_agent_class")
    def test_acks_on_successful_processing(self, mock_get_agent_class):
        ch, method, properties = make_channel_and_method()

        mock_agent = MagicMock()
        mock_agent.run = AsyncMock(return_value={"type": "math_model", "content": "x"})
        mock_agent_class = MagicMock(return_value=mock_agent)
        mock_get_agent_class.return_value = mock_agent_class

        body = make_body()
        callback(ch, method, properties, body)

        ch.basic_ack.assert_called_once_with(delivery_tag=method.delivery_tag)

    @patch("callback.get_agent_class")
    def test_publishes_response_on_success(self, mock_get_agent_class):
        ch, method, properties = make_channel_and_method()

        mock_agent = MagicMock()
        mock_agent.run = AsyncMock(return_value={"type": "math_model", "content": "x"})
        mock_agent_class = MagicMock(return_value=mock_agent)
        mock_get_agent_class.return_value = mock_agent_class

        body = make_body()
        callback(ch, method, properties, body)

        assert ch.basic_publish.call_count >= 1
        published_body = json.loads(ch.basic_publish.call_args[1]["body"])
        assert published_body["jobId"] == "job-123"
        assert published_body["status"] == "TASK_COMPLETED"

    @patch("callback.get_agent_class")
    def test_publishes_error_response_on_agent_failure(self, mock_get_agent_class):
        ch, method, properties = make_channel_and_method()

        mock_agent = MagicMock()
        mock_agent.run = AsyncMock(side_effect=RuntimeError("LLM failed"))
        mock_agent_class = MagicMock(return_value=mock_agent)
        mock_get_agent_class.return_value = mock_agent_class

        body = make_body()
        callback(ch, method, properties, body)

        published_body = json.loads(ch.basic_publish.call_args[1]["body"])
        assert published_body["status"] == "TASK_FAILED"
        assert "LLM failed" in published_body["error"]
