import os

import pika
import pika.exceptions
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASS", "guest")

RABBITMQ_IN_QUEUE = os.getenv("RABBITMQ_IN_QUEUE_AGENT", "ai_tasks_queue")
RABBITMQ_OUT_QUEUE = os.getenv("RABBITMQ_OUT_QUEUE_AGENT", "ai_results_queue")


def connect_rabbitmq():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)

    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
    )

    while True:
        try:
            connection = pika.BlockingConnection(parameters=parameters)
            channel = connection.channel()
            channel.queue_declare(queue=RABBITMQ_IN_QUEUE, durable=True)
            channel.queue_declare(queue=RABBITMQ_OUT_QUEUE, durable=True)
            return connection, channel
        except pika.exceptions.AMQPConnectionError as e:
            print(f"Connection failed ({e}), retrying in 5s...")
            import time

            time.sleep(5)
