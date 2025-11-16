import docker


class DockerManager:
    def __init__(self):
        self.client = self._initialize_client()

    def _initialize_client(self) -> docker.DockerClient | None:
        try:
            docker_client = docker.from_env()
            docker_client.ping()
            print("Docker client initialized successfully.")
            return docker_client
        except Exception as e:
            print(f"Error initializing Docker client: {e}")
            print(
                """
                  Make sure /var/run/docker.sock is accessible
                  and Docker is installed and running.
                """
            )
            return None
