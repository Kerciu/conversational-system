from rabbitmq_config import RABBITMQ_OUT_QUEUE
from code_sandbox import CodeSandbox, CodeExecutionResult, ExecutionStatus
from docker_manager import DockerManager
import pika
import json
import sys

try:
    docker_manager = DockerManager()

    if docker_manager.client:
        sandbox = CodeSandbox(
            client=docker_manager.client,
            image="python:3.13-slim",
            timeout=10,
            memory_limit="256m",
            pids_limit=100
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
        job_id = message_data.get('jobId')
        code_to_run = message_data.get('code')

        if not job_id or not code_to_run:
            print(f"No 'jobId' nor 'code' in message: {body}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        print(f"Got job: {job_id}. Executing code in sandbox...")

        exec_result: CodeExecutionResult = sandbox.run(code_to_run)

        if exec_result.status == ExecutionStatus.CODE_FAILED:
            print(f"Job: {job_id} executed with error (status: {exec_result.status_code}). Error: {exec_result.stderr}")
        else:
            print(f"Job: {job_id} executed successfully.")

        review_message = {
            'jobId': job_id,
            'status': exec_result.status.value,
            'generatedCode': exec_result.to_dict()
        }

        ch.basic_publish(
            exchange='',
            routing_key=RABBITMQ_OUT_QUEUE,
            body=json.dumps(review_message),
            properties=pika.BasicProperties(
                delivery_mode=2,
            )
        )

        print(f"Sent result for job: {job_id}")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Critical error processing message (jobId: {job_id}): {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
