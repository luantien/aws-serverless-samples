import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    logging.info('Received event: %s', event)
    try:
        response = boto3.client('comprehend').detect_sentiment(
            Text=event['message'],
            LanguageCode='en'
        )
    except Exception as e:
        logging.error(e)
        return e

    logging.info('Retrieved sentiment: %s', response)
    return response
