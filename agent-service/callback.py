import asyncio
import json

import pika
from agents.agent_registry import get_agent_class
from file_manager import save_files_to_disk
from rabbitmq_config import RABBITMQ_OUT_QUEUE


def callback(ch, method, properties, body):
    try:
        # print(f"DEBUG: Raw body received (first 200 chars): {body[:200]}")
        # message_data = json.loads(body)
        # print(f"DEBUG: Keys in JSON: {list(message_data.keys())}")
        # files_check = message_data.get("files")
        # print(f"DEBUG: 'files' value type: {type(files_check)}")
        # if isinstance(files_check, list):
        #     print(f"DEBUG: 'files' list length: {len(files_check)}")
        message_data = json.loads(body)
        job_id = message_data.get("jobId")
        agent_type_str = message_data.get("agentType")
        prompt = message_data.get("prompt")
        conversation_history = message_data.get("conversationHistory", [])
        context = message_data.get("context", "")
        accepted_model = message_data.get("acceptedModel", "")
        accepted_code = message_data.get("acceptedCode", "")
        files_data = message_data.get("files", [])

        if not all([job_id, agent_type_str, prompt]):
            print(f"Error: Incomplete message, rejecting: {message_data}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        print(f"Got job: {job_id}")
        print(f"Delegating work to {agent_type_str}")
        print(f"Conversation history length: {len(conversation_history)} messages")
        if accepted_model:
            print(f"Accepted model provided (length: {len(accepted_model)})")
        if accepted_code:
            print(f"Accepted code provided (length: {len(accepted_code)})")
        file_paths = []
        if files_data:
            print(f"Received {len(files_data)} file(s). Saving to disk for RAG...")
            file_paths = save_files_to_disk(files_data, job_id)

        AgentClass = get_agent_class(agent_type_str)

        if not AgentClass:
            print(
                f"Error: No agent found for type '{agent_type_str}'. Rejecting (NACK)."
            )
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        agent_instance = AgentClass()

        result_payload = asyncio.run(
            agent_instance.run(
                prompt,
                job_id,
                context=context,
                file_paths=file_paths,
                conversation_history=conversation_history,
                accepted_model=accepted_model,
                accepted_code=accepted_code,
            )
        )

        response_message = {
            "jobId": job_id,
            "status": "TASK_COMPLETED",
            "agentType": agent_type_str,
            "payload": result_payload,
        }

        ch.basic_publish(
            exchange="",
            routing_key=RABBITMQ_OUT_QUEUE,
            body=json.dumps(response_message),
            properties=pika.BasicProperties(
                delivery_mode=2,
            ),
        )
        print(f"Sent response for job: {job_id}")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Processing error: {e}")
        import traceback

        traceback.print_exc()

        try:
            message_data = json.loads(body)
            job_id = message_data.get("jobId")
            agent_type_str = message_data.get("agentType")

            if job_id:
                error_response = {
                    "jobId": job_id,
                    "status": "TASK_FAILED",
                    "agentType": agent_type_str or "UNKNOWN",
                    "error": str(e),
                }

                ch.basic_publish(
                    exchange="",
                    routing_key=RABBITMQ_OUT_QUEUE,
                    body=json.dumps(error_response),
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                    ),
                )
                print(f"Sent error response for job: {job_id}")
        except Exception as publish_error:
            print(f"Failed to send error response: {publish_error}")

        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
