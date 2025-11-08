import pytest
import docker
import pika
import json
from unittest.mock import MagicMock

from docker_manager import DockerManager
from code_sandbox import CodeSandbox, CodeExecutionResult, ExecutionStatus
from callback import callback


@pytest.fixture(scope="module")
def real_docker_client():
    try:
        client = docker.from_env()
        client.ping()
        return client
    except Exception:
        pytest.skip("Integration tests of Docker require a running Docker Daemon.")


@pytest.fixture(scope="module")
def real_sandbox(real_docker_client):
    image_name = "python:3.13-slim"
    try:
        real_docker_client.images.get(image_name)
    except docker.errors.ImageNotFound:
        print(f"Fetching image {image_name} for tests...")
        real_docker_client.images.pull(image_name)

    sandbox = CodeSandbox(
        client=real_docker_client,
        image=image_name,
        timeout=10,
        memory_limit="256m",
        pids_limit=100
    )
    return sandbox


@pytest.mark.real_docker
class TestCodeSandboxIntegration:

    def test_sandbox_run_success(self, real_sandbox):
        code = "print('hello world', end='')"
        result = real_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_EXECUTED
        assert result.status_code == 0
        assert result.stdout == 'hello world'
        assert result.stderr == ''

    def test_sandbox_run_failure_exit_code(self, real_sandbox):
        code = "import sys; sys.exit(42)"
        result = real_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_FAILED
        assert result.status_code == 42
        assert result.stdout == ''
        assert result.stderr == ''

    def test_sandbox_run_stderr_output(self, real_sandbox):
        code = "import sys; sys.stderr.write('error msg'); sys.exit(1)"
        result = real_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_FAILED
        assert result.status_code == 1
        assert result.stdout == ''
        assert result.stderr == 'error msg'

    def test_sandbox_run_timeout(self, real_docker_client):
        timeout_sandbox = CodeSandbox(
            client=real_docker_client,
            image="python:3.13-slim",
            timeout=1,
            memory_limit="64m"
        )
        code = "import time; time.sleep(3)"
        result = timeout_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_FAILED
        assert result.status_code == -1
        assert "Timeout error" in result.stderr

    def test_sandbox_init_no_client(self):
        with pytest.raises(RuntimeError, match="Docker client must be initialized"):
            CodeSandbox(None, "image", 10, "64m")


def test_code_execution_result_to_dict():
    result = CodeExecutionResult(
        status_code=0,
        stdout="out",
        stderr="err",
        status=ExecutionStatus.CODE_EXECUTED
    )
    expected_dict = {
        "statusCode": 0,
        "stdout": "out",
        "stderr": "err",
    }
    assert result.to_dict() == expected_dict


def test_docker_manager_init_success(monkeypatch):
    mock_docker_client = MagicMock(spec=docker.DockerClient)
    mock_from_env = MagicMock(return_value=mock_docker_client)
    monkeypatch.setattr("docker.from_env", mock_from_env)

    manager = DockerManager()

    assert manager.client == mock_docker_client
    mock_from_env.assert_called_once()
    mock_docker_client.ping.assert_called_once()


def test_docker_manager_init_fail(monkeypatch, capsys):
    mock_from_env = MagicMock(side_effect=Exception("Docker down"))
    monkeypatch.setattr("docker.from_env", mock_from_env)

    manager = DockerManager()

    assert manager.client is None
    captured = capsys.readouterr()
    assert "Error initializing Docker client" in captured.out


@pytest.fixture
def mock_callback_deps():
    mock_ch = MagicMock(spec=pika.channel.Channel)
    mock_method = MagicMock(spec=pika.spec.Basic.Deliver)
    mock_method.delivery_tag = 54321
    mock_props = MagicMock(spec=pika.spec.BasicProperties)
    return mock_ch, mock_method, mock_props


class TestCallbackFunction:

    def test_callback_success(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps

        mock_result = CodeExecutionResult(
            status_code=0,
            stdout="it works",
            stderr="",
            status=ExecutionStatus.CODE_EXECUTED
        )
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mock_sandbox.run.return_value = mock_result
        mocker.patch('callback.sandbox', mock_sandbox)

        body_data = {"jobId": "job-123", "code": "print('ok')"}
        body_json = json.dumps(body_data)

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_sandbox.run.assert_called_once_with("print('ok')")
        mock_ch.basic_ack.assert_called_once_with(delivery_tag=54321)
        mock_ch.basic_nack.assert_not_called()
        mock_ch.basic_publish.assert_called_once()

        publish_args = mock_ch.basic_publish.call_args[1]
        published_body = json.loads(publish_args['body'])

        assert published_body['jobId'] == 'job-123'
        assert published_body['status'] == 'CODE_EXECUTED'
        assert published_body['generatedCode']['stdout'] == 'it works'

    def test_callback_sandbox_fail(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps

        mock_result = CodeExecutionResult(
            status_code=1,
            stdout="",
            stderr="it broke",
            status=ExecutionStatus.CODE_FAILED
        )
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mock_sandbox.run.return_value = mock_result
        mocker.patch('callback.sandbox', mock_sandbox)

        body_data = {"jobId": "job-456", "code": "1/0"}
        body_json = json.dumps(body_data)

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_sandbox.run.assert_called_once_with("1/0")
        mock_ch.basic_ack.assert_called_once_with(delivery_tag=54321)
        mock_ch.basic_nack.assert_not_called()
        mock_ch.basic_publish.assert_called_once()

        published_body = json.loads(mock_ch.basic_publish.call_args[1]['body'])
        assert published_body['status'] == 'CODE_FAILED'
        assert published_body['generatedCode']['stderr'] == 'it broke'

    def test_callback_invalid_message_body(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mocker.patch('callback.sandbox', mock_sandbox)

        body_json = json.dumps({"foo": "bar"})

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_sandbox.run.assert_not_called()
        mock_ch.basic_ack.assert_not_called()
        mock_ch.basic_nack.assert_called_once_with(delivery_tag=54321, requeue=False)
        mock_ch.basic_publish.assert_not_called()

    def test_callback_json_decode_error(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mocker.patch('callback.sandbox', mock_sandbox)

        body_invalid_json = "{not json"

        callback(mock_ch, mock_method, mock_props, body_invalid_json)

        mock_sandbox.run.assert_not_called()
        mock_ch.basic_ack.assert_not_called()
        mock_ch.basic_nack.assert_called_once_with(delivery_tag=54321, requeue=False)
        mock_ch.basic_publish.assert_not_called()

    def test_callback_sandbox_disabled(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps
        mocker.patch('callback.sandbox', None)

        body_data = {"jobId": "job-123", "code": "print('ok')"}
        body_json = json.dumps(body_data)

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_ch.basic_ack.assert_not_called()
        mock_ch.basic_nack.assert_called_once_with(delivery_tag=54321, requeue=False)
        mock_ch.basic_publish.assert_not_called()
