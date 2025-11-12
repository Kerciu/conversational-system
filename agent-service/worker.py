from rabbitmq_config import connect_rabbitmq, RABBITMQ_IN_QUEUE
from callback import callback
import pika
import time


def start_worker():
    while True:
        try:
            _, channel = connect_rabbitmq()
            print("Connected to RabbitMQ successfully, waiting for tasks...")

            channel.basic_qos(prefetch_count=1)

            channel.basic_consume(
                queue=RABBITMQ_IN_QUEUE,
                on_message_callback=callback,
                auto_ack=False
            )

            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            print(f"Error: {e}. Connection to RabbitMQ failed, retrying...")
            time.sleep(5)

        except KeyboardInterrupt:
            print("Worker stopped by user.")
            break


if __name__ == "__main__":
    start_worker()
