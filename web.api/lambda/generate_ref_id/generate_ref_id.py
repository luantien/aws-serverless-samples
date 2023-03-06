import boto3
import logging
import uuid

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    # logging.info('Received event: %s', event)

    recordId = str(uuid.uuid4())

    logger.info('Generated UUID: {}'.format(recordId))

    return 'r#{}'.format(recordId)
