from dotenv import load_dotenv
import os
import pika

load_dotenv()

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASS", "guest")

RABBITMQ_IN_QUEUE = os.getenv("RABBITMQ_IN_QUEUE_SANDBOX", "code_execution_queue")
RABBITMQ_OUT_QUEUE = os.getenv("RABBITMQ_OUT_QUEUE_SANDBOX", "code_results_queue")


def connect_rabbitmq():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)

    parameters = pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)
    connection = pika.BlockingConnection(parameters=parameters)

    channel = connection.channel()
    channel.queue_declare(queue=RABBITMQ_IN_QUEUE, durable=True)
    channel.queue_declare(queue=RABBITMQ_OUT_QUEUE, durable=True)

    return connection, channel
