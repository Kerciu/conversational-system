from rabbitmq_config import RABBITMQ_OUT_QUEUE
import pika
import json
import time


def callback(ch, method, properties, body):
    try:
        message_data = json.loads(body)
        job_id = message_data['jobId']
        print(f"Got job: {job_id}")

        #   * Whole code EXECUTION logic would be here *
        #

        time.sleep(2)
        code_executed = f"""
            statusCode: 0, result: 'This is code for zajebisty job nr {job_id}'
        """

        review_message = {
            'jobId': job_id,
            'status': 'CODE_EXECUTED',
            'generatedCode': code_executed
        }

        #
        #   * End of code EXECUTION logic *

        ch.basic_publish(
            exchange='',
            routing_key=RABBITMQ_OUT_QUEUE,
            body=json.dumps(review_message),
            properties=pika.BasicProperties(
                delivery_mode=2,
            )
        )
        print(f"Sent code to review by programmer: {job_id}")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Processing error: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
