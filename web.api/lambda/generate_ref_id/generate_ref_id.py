import boto3
import logging
import uuid

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    logging.info('Received event: %s', event)

    recordId = uuid.uuid4()

    return 'r#{}'.format(str(recordId))
