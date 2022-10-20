import boto3
import logging
import os

email_from = os.getenv('EMAIL_FROM')
email_to = os.getenv('EMAIL_TO')

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    logger.info('Received event: %s', event)
    # raise Exception("Cannot send email properly")
    try:
        content = 'Sentiment analysis: {sentiment} review from user({reviewer}): "{message}".'
        result = content.format(
            sentiment=event['sentimentResult']['Payload']['Sentiment'],
            reviewer=event['reviewer'],
            message=event['message']
        )

        if email_from == '' or email_to == '':
            logger.error('No email address configured.')
            return {
                statusCode: 200,
                body: 'Cannot sent notification email, there may be a missing configuration.'
            }

        response = boto3.client('sesv2').send_email(
            FromEmailAddress=os.getenv('EMAIL_FROM'),
            Destination={
                'ToAddresses': [os.getenv('EMAIL_TO')]
            },
            Content={
                'Simple': {
                    'Subject': {
                        'Data': 'Review analysis result',
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': result,
                            'Charset': 'UTF-8',
                        }
                    },
                }
            }
        )
        logging.info('Email response: %s', response)
        return response

    except Exception as e:
        logger.error(e)
        return e
