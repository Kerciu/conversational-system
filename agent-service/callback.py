from rabbitmq_config import RABBITMQ_OUT_QUEUE
from agents.agent_registry import get_agent_class
import pika
import json
import asyncio


def callback(ch, method, properties, body):
    try:
        message_data = json.loads(body)
        job_id = message_data.get("jobId")
        agent_type_str = message_data.get("agentType")
        prompt = message_data.get("prompt")

        if not all([job_id, agent_type_str, prompt]):
            print(f"Error: Incomplete message, rejecting: {message_data}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        print(f"Got job: {job_id}")
        print(f"Delegating work to {agent_type_str}")

        AgentClass = get_agent_class(agent_type_str)

        if not AgentClass:
            print(
                f"Error: No agent found for type '{agent_type_str}'. Rejecting (NACK)."
            )
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        agent_instance = AgentClass()

        result_payload = asyncio.run(agent_instance.run(prompt, job_id))

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
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
