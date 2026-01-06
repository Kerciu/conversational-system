from rabbitmq_config import RABBITMQ_OUT_QUEUE
from code_sandbox import CodeSandbox, CodeExecutionResult, ExecutionStatus
from docker_manager import DockerManager
import pika
import json
import sys

try:
    docker_manager = DockerManager()

    if docker_manager.client:
        # Use custom image with required libs (pulp, matplotlib, numpy). Fallback to base if not set.
        import os

        # Default to the Compose-built image name (service: sandbox-service → conversational-system-sandbox-service)
        sandbox_image = os.getenv(
            "SANDBOX_IMAGE", "conversational-system-sandbox-service"
        )

        sandbox = CodeSandbox(
            client=docker_manager.client,
            image=sandbox_image,
            timeout=10,
            memory_limit="256m",
            pids_limit=100,
        )
        print("Sandbox (CodeSandbox) initialized and ready to work.")
    else:
        raise RuntimeError("Docker client failed to initialize.")

except Exception as e:
    print(f"CRITICAL ERROR: Unable to initialize services: {e}")
    print("Worker application will shut down.")
    sandbox = None
    sys.exit(1)

# ---------------------------------------------------------------------------
# RabbitMQ Callback
# ---------------------------------------------------------------------------


def callback(ch, method, properties, body):
    if sandbox is None:
        print("Error: Sandbox is not available. Rejecting task and not requeuing.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    job_id = None
    try:
        message_data = json.loads(body)
        job_id = message_data.get("jobId")
        code_to_run = message_data.get("code")

        if not job_id or not code_to_run:
            print(f"No 'jobId' nor 'code' in message: {body}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        print(f"Got job: {job_id}. Executing code in sandbox...")

        exec_result: CodeExecutionResult = sandbox.run(code_to_run)

        if exec_result.status == ExecutionStatus.CODE_FAILED:
            print(
                f"Job: {job_id} executed with error (status: {exec_result.status_code}). Error: {exec_result.stderr}"
            )
        else:
            print(f"Job: {job_id} executed successfully.")

        print(
            f"[Callback] exec_result.generated_files: {exec_result.generated_files is not None}, count: {len(exec_result.generated_files) if exec_result.generated_files else 0}"
        )
        result_dict = exec_result.to_dict()
        print(f"[Callback] result_dict keys: {result_dict.keys()}")
        print(
            f"[Callback] generatedFiles in result_dict: {'generatedFiles' in result_dict}, count: {len(result_dict.get('generatedFiles', {}))}"
        )

        review_message = {
            "jobId": job_id,
            "status": exec_result.status.value,
            "generatedCode": result_dict,
        }

        print(
            f"[Callback] review_message generatedCode keys: {review_message['generatedCode'].keys()}"
        )

        # Support per-request response queue (used by agent-service) to avoid backend consumers grabbing sandbox results
        response_queue = message_data.get("responseQueue", RABBITMQ_OUT_QUEUE)

        # Only declare queue if it's not an exclusive queue (exclusive queues like 'amq.gen-*' are auto-created by the requester)
        if not response_queue.startswith("amq.gen-"):
            ch.queue_declare(queue=response_queue, durable=False)

        ch.basic_publish(
            exchange="",
            routing_key=response_queue,
            body=json.dumps(review_message),
            properties=pika.BasicProperties(
                delivery_mode=2,
            ),
        )

        print(f"Sent result for job: {job_id} -> queue: {response_queue}")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Critical error processing message (jobId: {job_id}): {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
