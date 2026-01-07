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
        pids_limit=100,
    )
    return sandbox


@pytest.mark.real_docker
class TestCodeSandboxIntegration:
    def test_sandbox_run_success(self, real_sandbox):
        code = "print('hello world', end='')"
        result = real_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_EXECUTED
        assert result.status_code == 0
        assert result.stdout == "hello world"
        assert result.stderr == ""

    def test_sandbox_run_failure_exit_code(self, real_sandbox):
        code = "import sys; sys.exit(42)"
        result = real_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_FAILED
        assert result.status_code == 42
        assert result.stdout == ""
        assert result.stderr == ""

    def test_sandbox_run_stderr_output(self, real_sandbox):
        code = "import sys; sys.stderr.write('error msg'); sys.exit(1)"
        result = real_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_FAILED
        assert result.status_code == 1
        assert result.stdout == ""
        assert result.stderr == "error msg"

    def test_sandbox_run_timeout(self, real_docker_client):
        timeout_sandbox = CodeSandbox(
            client=real_docker_client,
            image="python:3.13-slim",
            timeout=1,
            memory_limit="64m",
        )
        code = "import time; time.sleep(3)"
        result = timeout_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_FAILED
        assert result.status_code == -1
        assert "Timeout error" in result.stderr

    def test_sandbox_init_no_client(self):
        with pytest.raises(RuntimeError, match="Docker client must be initialized"):
            CodeSandbox(None, "image", 10, "64m")

    def test_sandbox_generated_image_file(self, real_sandbox):
        """Test that sandbox can generate and extract image files"""

        # Example code that generates a simple PNG file
        code = """
import struct
import zlib

def create_minimal_png():
    # Minimal 1x1 red PNG
    header = b'\\x89PNG\\r\\n\\x1a\\n'
    
    # IHDR chunk (1x1 image)
    ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (compressed pixel data for red pixel)
    idat_data = zlib.compress(b'\\x00\\xff\\x00\\x00')
    idat_crc = zlib.crc32(b'IDAT' + idat_data) & 0xffffffff
    idat_chunk = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    return header + ihdr_chunk + idat_chunk + iend_chunk

png_data = create_minimal_png()
with open('/output/test_image.png', 'wb') as f:
    f.write(png_data)
print('Generated test_image.png')
"""
        result = real_sandbox.run(code)
        assert result.status == ExecutionStatus.CODE_EXECUTED
        assert result.status_code == 0
        assert "Generated test_image.png" in result.stdout
        assert result.generated_files is not None
        assert "test_image.png" in result.generated_files

        # Verify file is valid PNG bytes
        png_bytes = result.generated_files["test_image.png"]
        assert isinstance(png_bytes, bytes)

        # Verify it's valid PNG data
        assert png_bytes.startswith(b"\x89PNG\r\n\x1a\n"), "Invalid PNG header"


def test_code_execution_result_to_dict():
    result = CodeExecutionResult(
        status_code=0, stdout="out", stderr="err", status=ExecutionStatus.CODE_EXECUTED
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
            status=ExecutionStatus.CODE_EXECUTED,
        )
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mock_sandbox.run.return_value = mock_result
        mocker.patch("callback.sandbox", mock_sandbox)

        body_data = {"jobId": "job-123", "code": "print('ok')"}
        body_json = json.dumps(body_data)

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_sandbox.run.assert_called_once_with("print('ok')")
        mock_ch.basic_ack.assert_called_once_with(delivery_tag=54321)
        mock_ch.basic_nack.assert_not_called()
        mock_ch.basic_publish.assert_called_once()

        publish_args = mock_ch.basic_publish.call_args[1]
        published_body = json.loads(publish_args["body"])

        assert published_body["jobId"] == "job-123"
        assert published_body["status"] == "CODE_EXECUTED"
        assert published_body["generatedCode"]["stdout"] == "it works"

    def test_callback_sandbox_fail(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps

        mock_result = CodeExecutionResult(
            status_code=1,
            stdout="",
            stderr="it broke",
            status=ExecutionStatus.CODE_FAILED,
        )
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mock_sandbox.run.return_value = mock_result
        mocker.patch("callback.sandbox", mock_sandbox)

        body_data = {"jobId": "job-456", "code": "1/0"}
        body_json = json.dumps(body_data)

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_sandbox.run.assert_called_once_with("1/0")
        mock_ch.basic_ack.assert_called_once_with(delivery_tag=54321)
        mock_ch.basic_nack.assert_not_called()
        mock_ch.basic_publish.assert_called_once()

        published_body = json.loads(mock_ch.basic_publish.call_args[1]["body"])
        assert published_body["status"] == "CODE_FAILED"
        assert published_body["generatedCode"]["stderr"] == "it broke"

    def test_callback_invalid_message_body(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mocker.patch("callback.sandbox", mock_sandbox)

        body_json = json.dumps({"foo": "bar"})

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_sandbox.run.assert_not_called()
        mock_ch.basic_ack.assert_not_called()
        mock_ch.basic_nack.assert_called_once_with(delivery_tag=54321, requeue=False)
        mock_ch.basic_publish.assert_not_called()

    def test_callback_json_decode_error(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mocker.patch("callback.sandbox", mock_sandbox)

        body_invalid_json = "{not json"

        callback(mock_ch, mock_method, mock_props, body_invalid_json)

        mock_sandbox.run.assert_not_called()
        mock_ch.basic_ack.assert_not_called()
        mock_ch.basic_nack.assert_called_once_with(delivery_tag=54321, requeue=False)
        mock_ch.basic_publish.assert_not_called()

    def test_callback_sandbox_disabled(self, mock_callback_deps, mocker):
        mock_ch, mock_method, mock_props = mock_callback_deps
        mocker.patch("callback.sandbox", None)

        body_data = {"jobId": "job-123", "code": "print('ok')"}
        body_json = json.dumps(body_data)

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_ch.basic_ack.assert_not_called()
        mock_ch.basic_nack.assert_called_once_with(delivery_tag=54321, requeue=False)
        mock_ch.basic_publish.assert_not_called()

    def test_callback_with_generated_files(self, mock_callback_deps, mocker):
        """Test that callback includes generated files in visualization_report"""
        import base64

        mock_ch, mock_method, mock_props = mock_callback_deps

        # Create a mock result with generated files (simulating image generation)
        # Note: CodeExecutionResult expects bytes, converts to base64 in to_dict()
        png_bytes = b"PNG_FAKE_DATA_123"
        generated_files = {"plot.png": png_bytes}
        mock_result = CodeExecutionResult(
            status_code=0,
            stdout="plot generated",
            stderr="",
            status=ExecutionStatus.CODE_EXECUTED,
            generated_files=generated_files,
        )
        mock_sandbox = MagicMock(spec=CodeSandbox)
        mock_sandbox.run.return_value = mock_result
        mocker.patch("callback.sandbox", mock_sandbox)

        body_data = {
            "jobId": "job-viz-001",
            "code": "import matplotlib.pyplot as plt; plt.plot([1,2,3]); plt.savefig('plot.png')",
        }
        body_json = json.dumps(body_data)

        callback(mock_ch, mock_method, mock_props, body_json)

        mock_sandbox.run.assert_called_once()
        mock_ch.basic_ack.assert_called_once_with(delivery_tag=54321)
        mock_ch.basic_publish.assert_called_once()

        # Verify the published message contains visualization_report with files
        published_body = json.loads(mock_ch.basic_publish.call_args[1]["body"])
        assert published_body["jobId"] == "job-viz-001"
        assert published_body["status"] == "CODE_EXECUTED"

        # Check generatedCode contains generatedFiles
        generated_code = published_body["generatedCode"]
        assert "generatedFiles" in generated_code
        assert "plot.png" in generated_code["generatedFiles"]
        # Files are converted to base64 in to_dict()
        assert (
            generated_code["generatedFiles"]["plot.png"]
            == base64.b64encode(png_bytes).decode()
        )
