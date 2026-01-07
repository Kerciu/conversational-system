# code_sandbox.py
from docker.errors import ImageNotFound, ContainerError, APIError
from dataclasses import dataclass
import docker
import enum
import os
import uuid
import tarfile
import io
import base64


class ExecutionStatus(enum.Enum):
    CODE_EXECUTED = "CODE_EXECUTED"
    CODE_FAILED = "CODE_FAILED"


@dataclass
class CodeExecutionResult:
    status_code: int
    stdout: str
    stderr: str
    status: ExecutionStatus
    generated_files: dict = None  # {filename: bytes}

    def to_dict(self) -> dict:
        result = {
            "statusCode": self.status_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
        }
        if self.generated_files:
            result["generatedFiles"] = {
                name: base64.b64encode(data).decode()
                for name, data in self.generated_files.items()
            }
        return result


class CodeSandbox:
    def __init__(
        self,
        client: docker.DockerClient,
        image: str,
        timeout: int,
        memory_limit: str,
        pids_limit: int | None = None,
        output_dir: str | None = None,
    ):
        if client is None:
            raise RuntimeError("Docker client must be initialized")

        self.client = client
        self.image = image
        self.timeout = timeout
        self.memory_limit = memory_limit
        self.pids_limit = pids_limit
        self.output_dir = output_dir or "/tmp/sandbox_output"
        self._ensure_image()

    def run(self, code: str) -> CodeExecutionResult:
        container = None
        local_output_dir = None
        try:
            # Create unique output directory on host (fallback for volume mount)
            local_output_dir = f"/tmp/sandbox_{uuid.uuid4().hex}"
            os.makedirs(local_output_dir, exist_ok=True)

            # Prepend code to ensure /output directory exists
            instrumented_code = f"""
import os
os.makedirs('/output', exist_ok=True)

# Original user code
{code}
"""

            container = self.client.containers.create(
                image=self.image,
                command=["python3", "-c", instrumented_code],
                network_mode="none",
                mem_limit=self.memory_limit,
                pids_limit=self.pids_limit,
                read_only=False,
                volumes={local_output_dir: {"bind": "/output", "mode": "rw"}},
            )

            container.start()

            try:
                result = container.wait(timeout=self.timeout)
                status_code = result.get("StatusCode", -1)
            except Exception:
                container.kill()
                return CodeExecutionResult(
                    status_code=-1,
                    stdout="",
                    stderr=f"Timeout error: Code execution exceeded {self.timeout} seconds.",
                    status=ExecutionStatus.CODE_FAILED,
                )

            stdout = container.logs(stdout=True, stderr=False).decode("utf-8").strip()
            stderr = container.logs(stdout=False, stderr=True).decode("utf-8").strip()

            status = (
                ExecutionStatus.CODE_EXECUTED
                if status_code == 0
                else ExecutionStatus.CODE_FAILED
            )

            # Collect all PNG files directly from container using get_archive
            generated_files = {}
            try:
                # Get tar archive of /output directory from container
                tar_stream, stat_data = container.get_archive("/output")

                tar_bytes = b"".join(tar_stream)
                tar_file = tarfile.open(fileobj=io.BytesIO(tar_bytes))

                for member in tar_file.getmembers():
                    if member.name.lower().endswith(".png") and member.isfile():
                        # Extract just the filename without path
                        filename = os.path.basename(member.name)
                        f = tar_file.extractfile(member)
                        if f:
                            file_data = f.read()
                            generated_files[filename] = file_data

            except Exception as e:
                print(f"[CodeSandbox] Error extracting files from container: {e}")
                # Fallback to checking local_output_dir if mounted
                if os.path.exists(local_output_dir):
                    print(
                        f"[CodeSandbox] Fallback: Scanning directory: {local_output_dir}"
                    )
                    for root, dirs, files in os.walk(local_output_dir):
                        print(f"[CodeSandbox] Checking: {root}, files: {files}")
                        for filename in files:
                            if filename.lower().endswith(".png"):
                                filepath = os.path.join(root, filename)
                                print(
                                    f"[CodeSandbox] Found PNG: {filename} at {filepath}"
                                )
                                # Use only filename without path as key
                                with open(filepath, "rb") as f:
                                    file_data = f.read()
                                    generated_files[filename] = file_data
                                    print(
                                        f"[CodeSandbox] Collected {filename}: {len(file_data)} bytes"
                                    )

            print(
                f"[CodeSandbox] Final files collected: {len(generated_files)}, keys: {list(generated_files.keys())}"
            )

            return CodeExecutionResult(
                status_code, stdout, stderr, status, generated_files or None
            )

        except (ContainerError, APIError) as e:
            print(f"Container/API error occurred: {e}")
            return CodeExecutionResult(-1, "", str(e), ExecutionStatus.CODE_FAILED)
        except Exception as e:
            print(f"Unexpected error while executing Docker: {e}")
            return CodeExecutionResult(
                -1,
                "",
                f"An unexpected error occurred: {str(e)}",
                ExecutionStatus.CODE_FAILED,
            )
        finally:
            if container:
                try:
                    container.remove(force=True)
                except APIError as e:
                    print(f"Warning: Failed to remove container {container.id}: {e}")

            if local_output_dir and os.path.exists(local_output_dir):
                try:
                    import shutil

                    shutil.rmtree(local_output_dir)
                except Exception as e:
                    print(f"Warning: Failed to cleanup output directory: {e}")

    def _ensure_image(self):
        try:
            self.client.images.get(self.image)
            print(f"Image '{self.image}' found locally.")
        except ImageNotFound:
            print(f"Image '{self.image}' not found locally. Pulling...")
            try:
                self.client.images.pull(self.image)
                print(f"Successfully pulled image '{self.image}'.")
            except APIError as e:
                print(f"Error occurred while pulling image: {e}")
                raise
