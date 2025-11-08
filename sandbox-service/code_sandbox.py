# code_sandbox.py
from docker.errors import ImageNotFound, ContainerError, APIError
from dataclasses import dataclass
import docker
import enum


class ExecutionStatus(enum.Enum):
    CODE_EXECUTED = "CODE_EXECUTED"
    CODE_FAILED = "CODE_FAILED"


@dataclass
class CodeExecutionResult:
    status_code: int
    stdout: str
    stderr: str
    status: ExecutionStatus

    def to_dict(self) -> dict:
        return {
            "statusCode": self.status_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
        }


class CodeSandbox:
    def __init__(
        self,
        client: docker.DockerClient,
        image: str,
        timeout: int,
        memory_limit: str,
        pids_limit: int | None = None
    ):
        if client is None:
            raise RuntimeError("Docker client must be initialized")

        self.client = client
        self.image = image
        self.timeout = timeout
        self.memory_limit = memory_limit
        self.pids_limit = pids_limit
        self._ensure_image()

    def run(self, code: str) -> CodeExecutionResult:
        container = None
        try:
            container = self.client.containers.create(
                image=self.image,
                command=["python3", "-c", code],
                network_mode="none",
                mem_limit=self.memory_limit,
                pids_limit=self.pids_limit,
                read_only=True
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
                    status=ExecutionStatus.CODE_FAILED
                )

            stdout = container.logs(
                stdout=True, stderr=False
            ).decode('utf-8').strip()
            stderr = container.logs(
                stdout=False, stderr=True
            ).decode('utf-8').strip()

            status = ExecutionStatus.CODE_EXECUTED if status_code == 0 else ExecutionStatus.CODE_FAILED

            return CodeExecutionResult(status_code, stdout, stderr, status)

        except (ContainerError, APIError) as e:
            print(f"Container/API error occurred: {e}")
            return CodeExecutionResult(
                -1, "", str(e), ExecutionStatus.CODE_FAILED
            )
        except Exception as e:
            print(f"Unexpected error while executing Docker: {e}")
            return CodeExecutionResult(
                -1, "", f"An unexpected error occurred: {str(e)}",
                ExecutionStatus.CODE_FAILED
            )
        finally:
            if container:
                try:
                    container.remove(force=True)
                except APIError as e:
                    print(
                        f"Warning: Failed to remove container {container.id}: {e}"
                    )

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
